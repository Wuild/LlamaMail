import React from 'react';
import {cn} from '../utils';
import {formFieldVariants, FormInputProps} from './shared';

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
	({className, variant = 'subtle', size = 'lg', groupPosition = 'none', leftIcon, rightIcon, ...props}, ref) => (
		<div className="relative">
			{leftIcon ? (
				<span className="ui-text-muted pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
					{leftIcon}
				</span>
			) : null}
			<input
				ref={ref}
				{...props}
				className={cn(
					formFieldVariants({
						variant,
						size,
						groupPosition,
						grouped: groupPosition !== 'none',
						hasLeftIcon: Boolean(leftIcon),
						hasRightIcon: Boolean(rightIcon),
					}),
					className,
				)}
			/>
			{rightIcon ? (
				<span className="ui-text-muted pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2">
					{rightIcon}
				</span>
			) : null}
		</div>
	),
);
FormInput.displayName = 'FormInput';
