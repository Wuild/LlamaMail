import React from 'react';
import {cn} from '../utils';

export function FormControlGroup({className, children}: {className?: string; children: React.ReactNode}) {
	return <div className={cn('inline-flex items-stretch', className)}>{children}</div>;
}
