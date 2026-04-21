import React from 'react';
import {cn} from '../utils';
import {FormCheckboxProps, formToggleVariants} from './shared';

export const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(({className, size = 'md', ...props}, ref) => (
	<input
		ref={ref}
		type="checkbox"
		{...props}
		className={cn(formToggleVariants({size}), className)}
	/>
));
FormCheckbox.displayName = 'FormCheckbox';
