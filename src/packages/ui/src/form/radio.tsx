import React from 'react';
import {cn} from '../utils';
import {FormRadioProps, formRadioVariants} from './shared';

export const FormRadio = React.forwardRef<HTMLInputElement, FormRadioProps>(
	({className, size = 'md', variant = 'subtle', ...props}, ref) => (
		<input ref={ref} type="radio" {...props} className={cn(formRadioVariants({size, variant}), className)} />
	),
);
FormRadio.displayName = 'FormRadio';
