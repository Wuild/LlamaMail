import * as React from 'react';
import {cn} from './utils';
import {forwardRef, HTMLAttributes} from 'react';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(({className, ...props}, ref) => (
	<div ref={ref} className={cn('overflow-auto', className)} {...props} />
));

ScrollArea.displayName = 'ScrollArea';
