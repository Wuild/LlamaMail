import React, {useEffect, useMemo, useState} from 'react';
import {formatIsoDateForLocale, getLocaleDatePlaceholder, parseLocaleDateInput} from '../libs/localeInput';
import {FormInput} from './input';
import {createSyntheticInputChangeEvent, FormDateInputProps} from './shared';

export const FormDateInput = React.forwardRef<HTMLInputElement, FormDateInputProps>(
	({locale, value, onChange, onBlur, onKeyDown, placeholder, inputMode, autoComplete, name, ...props}, ref) => {
		const normalizedValue = typeof value === 'string' ? value : '';
		const displayValue = useMemo(() => formatIsoDateForLocale(normalizedValue, locale), [locale, normalizedValue]);
		const [draft, setDraft] = useState(displayValue);

		useEffect(() => {
			setDraft(displayValue);
		}, [displayValue]);

		const emitChange = (nextValue: string) => {
			onChange?.(createSyntheticInputChangeEvent(name, nextValue));
		};

		return (
			<FormInput
				ref={ref}
				{...props}
				name={name}
				type="text"
				value={draft}
				placeholder={placeholder || getLocaleDatePlaceholder(locale)}
				inputMode={inputMode || 'numeric'}
				autoComplete={autoComplete || 'off'}
				onChange={(event) => {
					const nextDraft = event.target.value;
					setDraft(nextDraft);
					const normalizedDraft = nextDraft.trim();
					if (!normalizedDraft) {
						if (normalizedValue) emitChange('');
						return;
					}
					const parsed = parseLocaleDateInput(normalizedDraft, locale);
					if (parsed && parsed !== normalizedValue) {
						emitChange(parsed);
					}
				}}
				onBlur={(event) => {
					const normalizedDraft = event.target.value.trim();
					if (!normalizedDraft) {
						setDraft('');
						if (normalizedValue) emitChange('');
						onBlur?.(event);
						return;
					}
					const parsed = parseLocaleDateInput(normalizedDraft, locale);
					if (!parsed) {
						setDraft(displayValue);
						onBlur?.(event);
						return;
					}
					if (parsed !== normalizedValue) {
						emitChange(parsed);
					}
					setDraft(formatIsoDateForLocale(parsed, locale));
					onBlur?.(event);
				}}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						(event.currentTarget as HTMLInputElement).blur();
					}
					onKeyDown?.(event);
				}}
			/>
		);
	},
);
FormDateInput.displayName = 'FormDateInput';
