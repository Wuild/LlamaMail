import React from 'react';
import {cn} from '../utils';
import {FormSwitchProps, formToggleVariants} from './shared';

export const FormSwitch = React.forwardRef<HTMLInputElement, FormSwitchProps>(({className, size = 'md', ...props}, ref) => (
	<input
		ref={ref}
		type="checkbox"
		role="switch"
		{...props}
		className={cn(formToggleVariants({size}), className)}
	/>
));
FormSwitch.displayName = 'FormSwitch';
