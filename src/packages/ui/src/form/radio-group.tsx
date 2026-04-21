import React, {useId} from 'react';
import {cn} from '../utils';
import {FormRadio} from './radio';

export type FormRadioGroupOption = {
	value: string;
	label: string;
	description?: string | null;
	disabled?: boolean;
};

type FormRadioGroupProps = {
	value: string;
	options: FormRadioGroupOption[];
	onChange: (value: string) => void;
	name?: string;
	className?: string;
	disabled?: boolean;
	'aria-label'?: string;
};

export function FormRadioGroup({
	value,
	options,
	onChange,
	name,
	className,
	disabled = false,
	'aria-label': ariaLabel,
}: FormRadioGroupProps) {
	const id = useId();
	const groupName = name || `form-radio-group-${id}`;

	return (
		<div role="radiogroup" aria-label={ariaLabel} className={cn('ui-border-default inline-flex w-full overflow-hidden rounded-md border', className)}>
			{options.map((option, index) => {
				const checked = value === option.value;
				const optionDisabled = disabled || Boolean(option.disabled);
				return (
					<label
						key={option.value}
						className={cn(
							'group relative flex min-w-0 flex-1 cursor-pointer items-center justify-center px-3 py-2.5 text-sm transition-colors',
							index !== options.length - 1 && 'border-r ui-border-default',
							checked ? 'button-primary' : 'button-secondary',
							optionDisabled && 'pointer-events-none opacity-60',
						)}
					>
						<FormRadio
							name={groupName}
							value={option.value}
							checked={checked}
							disabled={optionDisabled}
							onChange={() => onChange(option.value)}
							className="sr-only"
						/>
						<span className="truncate text-center">{option.label}</span>
						{option.description ? <span className="sr-only">{option.description}</span> : null}
					</label>
				);
			})}
		</div>
	);
}
