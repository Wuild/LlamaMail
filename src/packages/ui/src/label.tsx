import React, {ReactNode} from 'react';
import {FormCheckbox} from './form';

export interface LabelProps {
	label?: string;
	subtitle?: ReactNode;
	error?: string;
	description?: ReactNode;
	children?: ReactNode;
}


export function Label({label, subtitle, error, description, children}: LabelProps) {
	return (
		<>
			<label className="block text-sm">
				<div className="pr-3">
					{label && <span className="ui-text-secondary mb-1 block font-medium">{label}</span>}
					{subtitle && <p className="ui-text-muted mb-2 text-xs">{subtitle}</p>}
				</div>
				{children}
				{description && <p className="ui-text-muted text-xs">{description}</p>}
				{error && <p className="text-red-300 text-xs">{error}</p>}
			</label>
		</>
	);
}