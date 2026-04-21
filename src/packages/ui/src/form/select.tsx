import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {cn} from '../utils';
import {FormSelectProps, formFieldVariants, optionSizeStyles, variantStyles} from './shared';

type SelectOptionItem = {
	value: string;
	label: string;
	disabled: boolean;
	selected: boolean;
	description?: string | null;
	icon?: React.ReactNode;
};

function flattenSelectOptions(children: React.ReactNode): SelectOptionItem[] {
	const out: SelectOptionItem[] = [];
	const walk = (nodes: React.ReactNode) => {
		React.Children.forEach(nodes, (child) => {
			if (!React.isValidElement(child)) return;
			const element = child as React.ReactElement<any>;
			if (element.type === 'option') {
				const value =
					element.props.value != null ? String(element.props.value) : getNodeText(element.props.children);
				out.push({
					value,
					label: getNodeText(element.props.children),
					disabled: Boolean(element.props.disabled),
					selected: Boolean(element.props.selected),
				});
				return;
			}
			if (element.type === 'optgroup') {
				walk(element.props.children);
			}
		});
	};
	walk(children);
	return out;
}

function getNodeText(node: React.ReactNode): string {
	if (node == null) return '';
	if (typeof node === 'string' || typeof node === 'number') return String(node);
	if (Array.isArray(node)) return node.map((entry) => getNodeText(entry)).join('');
	if (React.isValidElement(node)) {
		const element = node as React.ReactElement<any>;
		return getNodeText(element.props.children);
	}
	return '';
}

function findNextEnabledOptionIndex(options: SelectOptionItem[], startIndex: number, direction: 1 | -1): number {
	if (options.length === 0) return -1;
	for (let step = 1; step <= options.length; step += 1) {
		const index = (startIndex + direction * step + options.length) % options.length;
		if (!options[index]?.disabled) return index;
	}
	return -1;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
	(
		{
			className,
			variant = 'subtle',
			size = 'lg',
			groupPosition = 'none',
			leftIcon,
			rightIcon,
			children,
			value,
			defaultValue,
			onChange,
			onFocus,
			onBlur,
			onKeyDown,
			disabled,
			name,
			id,
			required,
			tabIndex,
			options,
			renderSelectedOption,
			renderOption,
			dropdownClassName,
		},
		ref,
	) => {
		const optionItems = useMemo(
			() =>
				options
					? options.map((item) => ({
							value: item.value,
							label: item.label,
							disabled: Boolean(item.disabled),
							selected: Boolean(item.selected),
							description: item.description ?? null,
							icon: item.icon,
						}))
					: flattenSelectOptions(children),
			[children, options],
		);
		const isControlled = value !== undefined;
		const [internalValue, setInternalValue] = useState<string>(() => {
			if (defaultValue != null) return String(defaultValue);
			const explicitSelected = optionItems.find((item) => item.selected);
			if (explicitSelected) return explicitSelected.value;
			return optionItems[0]?.value ?? '';
		});
		const selectedValue = isControlled ? String(value ?? '') : internalValue;
		const selectedIndex = useMemo(
			() => optionItems.findIndex((item) => item.value === selectedValue),
			[optionItems, selectedValue],
		);
		const [open, setOpen] = useState(false);
		const [activeIndex, setActiveIndex] = useState<number>(() =>
			selectedIndex >= 0 ? selectedIndex : findNextEnabledOptionIndex(optionItems, -1, 1),
		);
		const rootRef = useRef<HTMLDivElement | null>(null);
		const triggerRef = useRef<HTMLButtonElement | null>(null);
		const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);
		const dropdownRef = useRef<HTMLDivElement | null>(null);
		const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

		useEffect(() => {
			if (isControlled) return;
			if (!optionItems.some((item) => item.value === internalValue)) {
				setInternalValue(optionItems[0]?.value ?? '');
			}
		}, [internalValue, isControlled, optionItems]);

		useEffect(() => {
			if (!open) return;
			const fallbackIndex = findNextEnabledOptionIndex(optionItems, -1, 1);
			setActiveIndex(selectedIndex >= 0 ? selectedIndex : fallbackIndex);
		}, [open, optionItems, selectedIndex]);

		useEffect(() => {
			const handlePointerDown = (event: MouseEvent) => {
				const node = rootRef.current;
				const dropdownNode = dropdownRef.current;
				const target = event.target as Node;
				if (!node) return;
				if (!node.contains(target) && !dropdownNode?.contains(target)) {
					setOpen(false);
				}
			};
			document.addEventListener('mousedown', handlePointerDown);
			return () => document.removeEventListener('mousedown', handlePointerDown);
		}, []);

		useEffect(() => {
			if (!open) return;
			const updateDropdownPosition = () => {
				const triggerNode = triggerRef.current;
				if (!triggerNode) return;
				const rect = triggerNode.getBoundingClientRect();
				const margin = 8;
				const gap = 6;
				const width = Math.max(160, rect.width);
				const spaceBelow = window.innerHeight - rect.bottom - margin;
				const spaceAbove = rect.top - margin;
				const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
				const top = preferBelow
					? Math.min(rect.bottom + gap, window.innerHeight - margin)
					: Math.max(margin, rect.top - gap);
				const maxHeight = Math.max(120, (preferBelow ? spaceBelow : spaceAbove) - gap);
				const maxLeft = Math.max(margin, window.innerWidth - width - margin);
				const left = Math.min(Math.max(rect.left, margin), maxLeft);
				setDropdownStyle({
					position: 'fixed',
					left,
					top,
					width,
					maxHeight,
					zIndex: 1400,
					transform: preferBelow ? undefined : 'translateY(-100%)',
				});
			};
			updateDropdownPosition();
			window.addEventListener('resize', updateDropdownPosition);
			window.addEventListener('scroll', updateDropdownPosition, true);
			return () => {
				window.removeEventListener('resize', updateDropdownPosition);
				window.removeEventListener('scroll', updateDropdownPosition, true);
			};
		}, [open]);

		const selectedOption = optionItems[selectedIndex >= 0 ? selectedIndex : 0] ?? null;
		const displayLabel = selectedOption?.label ?? '';

		const emitChange = (nextValue: string) => {
			if (!isControlled) {
				setInternalValue(nextValue);
			}
			if (hiddenSelectRef.current) {
				hiddenSelectRef.current.value = nextValue;
			}
			if (onChange) {
				const syntheticEvent = {
					target: {value: nextValue, name: name ?? ''},
					currentTarget: {value: nextValue, name: name ?? ''},
				} as React.ChangeEvent<HTMLSelectElement>;
				onChange(syntheticEvent);
			}
		};

		const selectByIndex = (index: number) => {
			const target = optionItems[index];
			if (!target || target.disabled) return;
			emitChange(target.value);
		};

		return (
			<div ref={rootRef} className="relative">
				<select
					ref={(node) => {
						hiddenSelectRef.current = node;
						if (typeof ref === 'function') {
							ref(node);
						} else if (ref) {
							ref.current = node;
						}
					}}
					name={name}
					id={id}
					required={required}
					value={selectedValue}
					onChange={(event) => emitChange(event.target.value)}
					onFocus={(event) => {
						onFocus?.(event);
						if (disabled) return;
						setOpen(true);
						requestAnimationFrame(() => {
							triggerRef.current?.focus();
						});
					}}
					className="sr-only"
					tabIndex={-1}
					aria-hidden
				>
					{options
						? options.map((item) => (
								<option key={item.value} value={item.value} disabled={item.disabled}>
									{item.label}
								</option>
							))
						: children}
				</select>
				{leftIcon ? (
					<span className="ui-text-muted pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
						{leftIcon}
					</span>
				) : null}
				<button
					ref={triggerRef}
					type="button"
					name={name}
					id={id ? `${id}__trigger` : undefined}
					disabled={disabled}
					tabIndex={tabIndex}
					aria-haspopup="listbox"
					aria-expanded={open}
					className={cn(
						'flex items-center justify-between text-left',
						formFieldVariants({
							variant,
							size,
							groupPosition,
							grouped: groupPosition !== 'none',
							hasLeftIcon: Boolean(leftIcon),
							hasRightIcon: true,
						}),
						className,
					)}
					onFocus={(event) => {
						onFocus?.(event as unknown as React.FocusEvent<HTMLSelectElement>);
					}}
					onBlur={(event) => {
						onBlur?.(event as unknown as React.FocusEvent<HTMLSelectElement>);
					}}
					onClick={() => {
						if (disabled) return;
						setOpen((prev) => !prev);
					}}
					onKeyDown={(event) => {
						onKeyDown?.(event as unknown as React.KeyboardEvent<HTMLSelectElement>);
						if (event.defaultPrevented || disabled) return;
						const key = event.key;
						if (key === 'ArrowDown' || key === 'ArrowUp') {
							event.preventDefault();
							const direction = key === 'ArrowDown' ? 1 : -1;
							if (!open) {
								setOpen(true);
								setActiveIndex((prev) =>
									findNextEnabledOptionIndex(optionItems, prev < 0 ? selectedIndex : prev, direction),
								);
								return;
							}
							setActiveIndex((prev) => findNextEnabledOptionIndex(optionItems, prev, direction));
							return;
						}
						if (key === 'Enter' || key === ' ') {
							event.preventDefault();
							if (!open) {
								setOpen(true);
								return;
							}
							if (activeIndex >= 0) {
								selectByIndex(activeIndex);
							}
							setOpen(false);
							return;
						}
						if (key === 'Escape') {
							if (!open) return;
							event.preventDefault();
							setOpen(false);
							return;
						}
						if (key === 'Tab' && open) {
							if (activeIndex >= 0) {
								selectByIndex(activeIndex);
							}
							setOpen(false);
						}
					}}
				>
					<span className="block min-w-0 truncate">
						{renderSelectedOption ? (
							renderSelectedOption(selectedOption)
						) : (
							<span className="truncate">{displayLabel}</span>
						)}
					</span>
					<span className="ui-text-muted pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2">
						{rightIcon ?? <span aria-hidden>{open ? '▴' : '▾'}</span>}
					</span>
				</button>
				{open
					? createPortal(
							<div
								ref={dropdownRef}
								role="listbox"
								style={dropdownStyle}
								className={cn(
									'field mt-1 overflow-auto rounded-lg border p-1 shadow-lg',
									variantStyles[variant],
									dropdownClassName,
								)}
							>
								{optionItems.map((item, index) => {
									const isActive = index === activeIndex;
									const isSelected = item.value === selectedValue;
									return (
										<button
											key={`${item.value}:${index}`}
											type="button"
											role="option"
											aria-selected={isSelected}
											disabled={item.disabled}
											className={cn(
												'block w-full rounded-md text-left transition-colors',
												optionSizeStyles[size],
												item.disabled
													? 'cursor-not-allowed ui-text-muted opacity-60'
													: isActive
														? 'ui-surface-active ui-text-primary'
														: 'ui-surface-hover ui-text-primary',
												isSelected && !item.disabled && 'font-semibold',
											)}
											onMouseEnter={() => {
												if (!item.disabled) setActiveIndex(index);
											}}
											onMouseDown={(event) => {
												event.preventDefault();
												if (item.disabled) return;
												selectByIndex(index);
												setOpen(false);
												triggerRef.current?.focus();
											}}
										>
											{renderOption ? (
												renderOption(item, {active: isActive, selected: isSelected})
											) : (
												<div className="flex min-w-0 items-center gap-2">
													{item.icon ? <span className="shrink-0">{item.icon}</span> : null}
													<span className="min-w-0 flex-1">
														<span className="block truncate">{item.label}</span>
														{item.description ? (
															<span className="ui-text-muted block truncate text-[11px]">
																{item.description}
															</span>
														) : null}
													</span>
												</div>
											)}
										</button>
									);
								})}
							</div>,
							document.body,
						)
					: null}
			</div>
		);
	},
);
FormSelect.displayName = 'FormSelect';
