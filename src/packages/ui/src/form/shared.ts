import type React from 'react';
import {cva} from 'class-variance-authority';

export type ControlVariant = 'default' | 'subtle';
export type ControlSize = 'sm' | 'md' | 'lg';
export type GroupPosition = 'none' | 'first' | 'middle' | 'last';
export type InputLikeProps = {
	variant?: ControlVariant;
	size?: ControlSize;
	groupPosition?: GroupPosition;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
};

export const fieldBase = 'field w-full transition-all disabled:cursor-not-allowed disabled:opacity-60';

export const variantStyles: Record<ControlVariant, string> = {
	default: '',
	subtle: 'field-subtle',
};

export const sizeStyles: Record<ControlSize, string> = {
	sm: 'h-10 px-3 text-sm',
	md: 'h-11 px-3.5 text-sm',
	lg: 'h-12 px-4 text-base',
};
export const optionSizeStyles: Record<ControlSize, string> = {
	sm: 'px-3 py-2 text-sm',
	md: 'px-3 py-2 text-sm',
	lg: 'px-3.5 py-2.5 text-base',
};

export const groupStyles: Record<GroupPosition, string> = {
	none: 'rounded-lg',
	first: 'rounded-l-lg rounded-r-none',
	middle: 'rounded-none',
	last: 'rounded-l-none rounded-r-lg',
};

export const formFieldVariants = cva(fieldBase, {
	variants: {
		variant: variantStyles,
		size: sizeStyles,
		groupPosition: groupStyles,
		grouped: {
			true: 'relative first:-ml-px',
			false: '',
		},
		hasLeftIcon: {
			true: 'pl-9',
			false: '',
		},
		hasRightIcon: {
			true: 'pr-9',
			false: '',
		},
	},
	defaultVariants: {
		variant: 'subtle',
		size: 'lg',
		groupPosition: 'none',
		grouped: false,
		hasLeftIcon: false,
		hasRightIcon: false,
	},
});

export const formTextareaVariants = cva(fieldBase, {
	variants: {
		variant: variantStyles,
		size: {
			sm: 'min-h-[96px] px-3 py-2.5 text-sm',
			md: 'min-h-[116px] px-3.5 py-3 text-sm',
			lg: 'min-h-[136px] px-4 py-3.5 text-base',
		},
		groupPosition: groupStyles,
		grouped: {
			true: 'relative first:-ml-px',
			false: '',
		},
	},
	defaultVariants: {
		variant: 'subtle',
		size: 'lg',
		groupPosition: 'none',
		grouped: false,
	},
});

export const formToggleVariants = cva(
	[
		'relative flex-shrink-0 appearance-none rounded-full border outline-none transition-all duration-200',
		'field-toggle',
		"before:absolute before:top-1/2 before:-translate-y-1/2 before:rounded-full before:shadow before:transition-all before:duration-200 before:content-['']",
		'focus-ring',
		'disabled:cursor-not-allowed disabled:opacity-50',
	],
	{
		variants: {
			size: {
				sm: 'h-5 w-9 before:left-[2px] before:h-4 before:w-4 checked:before:translate-x-4',
				md: 'h-6 w-11 before:left-[2px] before:h-[18px] before:w-[18px] checked:before:translate-x-[22px]',
			},
		},
		defaultVariants: {
			size: 'md',
		},
	},
);

export const formRadioVariants = cva(
	[
		'field focus-ring relative inline-block flex-shrink-0 appearance-none rounded-full border transition-colors',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-current after:opacity-0 after:content-[""]',
		'checked:after:opacity-100',
	],
	{
		variants: {
			variant: variantStyles,
			size: {
				sm: 'h-4 w-4',
				md: 'h-5 w-5',
			},
		},
		defaultVariants: {
			variant: 'subtle',
			size: 'md',
		},
	},
);

export type FormInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & InputLikeProps;
export type FormDateInputProps = Omit<FormInputProps, 'type'> & {
	locale?: string;
};
export type FormDateTimeInputProps = Omit<FormInputProps, 'type'> & {
	locale?: string;
	minuteStep?: number;
};
export type FormSelectOption = {
	value: string;
	label: string;
	description?: string | null;
	icon?: React.ReactNode;
	disabled?: boolean;
	selected?: boolean;
};

export type FormSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> &
	InputLikeProps & {
		options?: FormSelectOption[];
		renderSelectedOption?: (option: FormSelectOption | null) => React.ReactNode;
		renderOption?: (option: FormSelectOption, state: {active: boolean; selected: boolean}) => React.ReactNode;
		dropdownClassName?: string;
	};
export type FormTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> &
	Omit<InputLikeProps, 'leftIcon' | 'rightIcon'>;

export type AutoCompleteRow = {
	id: string;
	label: string;
	value: string;
	description?: string | null;
};

export type FormCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {size?: 'sm' | 'md'};
export type FormSwitchProps = FormCheckboxProps;
export type FormRadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
	size?: 'sm' | 'md';
	variant?: ControlVariant;
};

export function createSyntheticInputChangeEvent(
	name: string | undefined,
	value: string,
): React.ChangeEvent<HTMLInputElement> {
	return {
		target: {value, name: name || ''},
		currentTarget: {value, name: name || ''},
	} as React.ChangeEvent<HTMLInputElement>;
}
