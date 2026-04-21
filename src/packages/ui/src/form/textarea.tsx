import React from 'react';
import {cn} from '../utils';
import {formTextareaVariants, FormTextareaProps} from './shared';

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
	({className, variant = 'subtle', size = 'lg', groupPosition = 'none', ...props}, ref) => (
		<textarea
			ref={ref}
			{...props}
			className={cn(
				formTextareaVariants({
					variant,
					size,
					groupPosition,
					grouped: groupPosition !== 'none',
				}),
				className,
			)}
		/>
	),
);
FormTextarea.displayName = 'FormTextarea';
