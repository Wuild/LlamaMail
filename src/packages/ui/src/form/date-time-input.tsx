import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {CalendarDays, ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '../button';
import {
	composeLocalDateTimeValue,
	formatLocalDateTimeValueForLocale,
	getLocaleDatePlaceholder,
	parseLocalDateTimeValue,
	splitLocalDateTimeValue,
} from '../libs/localeInput';
import {cn} from '../utils';
import {FormInput} from './input';
import {createSyntheticInputChangeEvent, FormDateTimeInputProps} from './shared';
import {FormSelect} from './select';

function toIsoDate(date: Date): string {
	const year = `${date.getFullYear()}`.padStart(4, '0');
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
	const next = new Date(base);
	next.setDate(next.getDate() + days);
	return next;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarGrid(visibleMonth: Date): Date[] {
	const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
	const mondayFirstOffset = (monthStart.getDay() + 6) % 7;
	const gridStart = addDays(monthStart, -mondayFirstOffset);
	return Array.from({length: 42}, (_, index) => addDays(gridStart, index));
}

export const FormDateTimeInput = React.forwardRef<HTMLInputElement, FormDateTimeInputProps>(
	(
		{
			locale,
			value,
			onChange,
			name,
			id,
			required,
			disabled,
			className,
			minuteStep = 30,
			variant = 'subtle',
			size = 'lg',
			...props
		},
		ref,
	) => {
		const rawValue = typeof value === 'string' ? value : '';
		const {date, time} = splitLocalDateTimeValue(rawValue);
		const parsedDateTime = useMemo(() => parseLocalDateTimeValue(rawValue), [rawValue]);
		const [open, setOpen] = useState(false);
		const [visibleMonth, setVisibleMonth] = useState<Date>(() => parsedDateTime || new Date());
		const rootRef = useRef<HTMLDivElement | null>(null);
		const triggerRef = useRef<HTMLInputElement | null>(null);
		const popoverRef = useRef<HTMLDivElement | null>(null);
		const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
		const displayValue = formatLocalDateTimeValueForLocale(rawValue, locale);

		useEffect(() => {
			if (!open || !parsedDateTime) return;
			setVisibleMonth(parsedDateTime);
		}, [open, parsedDateTime]);

		useEffect(() => {
			if (!open) return;
			const handlePointerDown = (event: MouseEvent) => {
				const node = rootRef.current;
				const popoverNode = popoverRef.current;
				const target = event.target as Node;
				if (!node) return;
				if (!node.contains(target) && !popoverNode?.contains(target)) {
					setOpen(false);
				}
			};
			const handleEscape = (event: KeyboardEvent) => {
				if (event.key !== 'Escape') return;
				setOpen(false);
				triggerRef.current?.focus();
			};
			document.addEventListener('mousedown', handlePointerDown);
			document.addEventListener('keydown', handleEscape);
			return () => {
				document.removeEventListener('mousedown', handlePointerDown);
				document.removeEventListener('keydown', handleEscape);
			};
		}, [open]);

		useEffect(() => {
			if (!open) return;
			const updatePopoverPosition = () => {
				const triggerNode = triggerRef.current;
				if (!triggerNode) return;
				const rect = triggerNode.getBoundingClientRect();
				const margin = 8;
				const gap = 6;
				const availableWidth = Math.max(260, window.innerWidth - margin * 2);
				const width = Math.min(Math.max(rect.width, 352), availableWidth);
				const maxLeft = Math.max(margin, window.innerWidth - width - margin);
				const left = Math.min(Math.max(rect.left, margin), maxLeft);
				const spaceBelow = window.innerHeight - rect.bottom - margin;
				const spaceAbove = rect.top - margin;
				const preferBelow = spaceBelow >= 320 || spaceBelow >= spaceAbove;
				const top = preferBelow
					? Math.min(rect.bottom + gap, window.innerHeight - margin)
					: Math.max(margin, rect.top - gap);
				const maxHeight = Math.max(220, (preferBelow ? spaceBelow : spaceAbove) - gap);
				setPopoverStyle({
					position: 'fixed',
					left,
					top,
					width,
					maxHeight,
					overflowY: 'auto',
					zIndex: 1300,
					transform: preferBelow ? undefined : 'translateY(-100%)',
				});
			};
			updatePopoverPosition();
			window.addEventListener('resize', updatePopoverPosition);
			window.addEventListener('scroll', updatePopoverPosition, true);
			return () => {
				window.removeEventListener('resize', updatePopoverPosition);
				window.removeEventListener('scroll', updatePopoverPosition, true);
			};
		}, [open]);

		const emitChange = (nextDate: string, nextTime: string) => {
			const nextValue = composeLocalDateTimeValue(nextDate, nextTime);
			onChange?.(createSyntheticInputChangeEvent(name, nextValue));
		};

		const monthTitle = useMemo(
			() =>
				new Intl.DateTimeFormat(locale || undefined, {
					month: 'long',
					year: 'numeric',
				}).format(visibleMonth),
			[locale, visibleMonth],
		);

		const weekdayLabels = useMemo(() => {
			const formatter = new Intl.DateTimeFormat(locale || undefined, {weekday: 'short'});
			const monday = new Date(2026, 0, 5);
			return Array.from({length: 7}, (_, index) => formatter.format(addDays(monday, index)));
		}, [locale]);

		const calendarCells = useMemo(() => buildCalendarGrid(visibleMonth), [visibleMonth]);

		const timeOptions = useMemo(() => {
			const safeStep = Number.isFinite(minuteStep) && minuteStep > 0 ? Math.min(60, Math.max(5, minuteStep)) : 30;
			const formatter = new Intl.DateTimeFormat(locale || undefined, {
				hour: 'numeric',
				minute: '2-digit',
			});
			const output: Array<{value: string; label: string}> = [];
			for (let hour = 0; hour < 24; hour += 1) {
				for (let minute = 0; minute < 60; minute += safeStep) {
					const hh = `${hour}`.padStart(2, '0');
					const mm = `${minute}`.padStart(2, '0');
					const stamp = new Date(2026, 0, 1, hour, minute, 0, 0);
					output.push({
						value: `${hh}:${mm}`,
						label: formatter.format(stamp),
					});
				}
			}
			return output;
		}, [locale, minuteStep]);

		const selectedDate = date ? new Date(`${date}T00:00:00`) : null;
		const today = new Date();
		const visibleMonthIndex = visibleMonth.getMonth();

		return (
			<div ref={rootRef} className={cn('relative', className)}>
				<FormInput
					{...props}
					ref={(node) => {
						triggerRef.current = node;
						if (typeof ref === 'function') {
							ref(node);
						} else if (ref) {
							ref.current = node;
						}
					}}
					id={id}
					name={name}
					required={required}
					disabled={disabled}
					variant={variant}
					size={size}
					value={displayValue}
					readOnly
					placeholder={`${getLocaleDatePlaceholder(locale)} 00:00`}
					rightIcon={<CalendarDays size={15} />}
					onClick={() => {
						if (!disabled) setOpen((prev) => !prev);
					}}
					onKeyDown={(event) => {
						if (disabled) return;
						if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
							event.preventDefault();
							setOpen(true);
						}
					}}
				/>
				{open
					? createPortal(
							<div
								ref={popoverRef}
								className="menu date-time-picker-popover rounded-lg border p-3 shadow-lg"
								style={popoverStyle}
							>
								<div className="date-time-picker-calendar">
									<div className="date-time-picker-header mb-2 flex items-center justify-between">
										<span className="date-time-picker-month text-base font-semibold">{monthTitle}</span>
										<div className="flex items-center gap-1">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="date-time-picker-nav-button h-8 w-8 rounded-md"
												onClick={() =>
													setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))
												}
												aria-label="Previous month"
											>
												<ChevronLeft size={14} />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="date-time-picker-nav-button h-8 w-8 rounded-md"
												onClick={() =>
													setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))
												}
												aria-label="Next month"
											>
												<ChevronRight size={14} />
											</Button>
										</div>
									</div>
									<div className="date-time-picker-weekdays mb-1 grid grid-cols-7 gap-1">
										{weekdayLabels.map((weekday) => (
											<span key={weekday} className="date-time-picker-weekday text-center text-[11px] font-medium">
												{weekday}
											</span>
										))}
									</div>
									<div className="date-time-picker-days grid grid-cols-7 gap-1">
										{calendarCells.map((cellDate) => {
											const isOutsideMonth = cellDate.getMonth() !== visibleMonthIndex;
											const isToday = isSameCalendarDay(cellDate, today);
											const isSelected = selectedDate ? isSameCalendarDay(cellDate, selectedDate) : false;
											return (
												<Button
													key={toIsoDate(cellDate)}
													type="button"
													variant="ghost"
													size="none"
													className={cn(
														'date-time-picker-day h-8 rounded-md px-0 text-sm',
														isOutsideMonth && 'date-time-picker-day-outside',
														isToday && !isSelected && 'date-time-picker-day-today',
														isSelected && 'date-time-picker-day-selected',
													)}
													onClick={() => emitChange(toIsoDate(cellDate), time || '09:00')}
												>
													{cellDate.getDate()}
												</Button>
											);
										})}
									</div>
								</div>
								<div className="date-time-picker-footer mt-2 flex items-center gap-2 border-t pt-2">
									<FormSelect
										value={time || ''}
										size="sm"
										className="flex-1"
										options={[{value: '', label: 'Select time'}, ...timeOptions]}
										onChange={(event) => {
											const nextTime = event.target.value;
											if (!nextTime) return;
											const baseDate =
												date ||
												(() => {
													const now = new Date();
													const yyyy = `${now.getFullYear()}`.padStart(4, '0');
													const mm = `${now.getMonth() + 1}`.padStart(2, '0');
													const dd = `${now.getDate()}`.padStart(2, '0');
													return `${yyyy}-${mm}-${dd}`;
												})();
											emitChange(baseDate, nextTime);
										}}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => {
											const now = new Date();
											const yyyy = `${now.getFullYear()}`.padStart(4, '0');
											const mm = `${now.getMonth() + 1}`.padStart(2, '0');
											const dd = `${now.getDate()}`.padStart(2, '0');
											const hh = `${now.getHours()}`.padStart(2, '0');
											const min = `${now.getMinutes()}`.padStart(2, '0');
											emitChange(`${yyyy}-${mm}-${dd}`, `${hh}:${min}`);
										}}
									>
										Now
									</Button>
									<Button type="button" variant="default" size="sm" onClick={() => setOpen(false)}>
										Done
									</Button>
								</div>
							</div>,
							document.body,
						)
					: null}
			</div>
		);
	},
);
FormDateTimeInput.displayName = 'FormDateTimeInput';
