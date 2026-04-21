import {ReactNode} from 'react';
import {ScrollArea} from './scroll-area';
import {cn} from './utils';

interface ContainerProps {
	children: ReactNode;
	className?: string;
}

export function Container({children, className}: ContainerProps) {
	return (
		<ScrollArea className="min-h-0 h-full">
			<div className="mx-auto w-full max-w-5xl">
				<div className={cn('p-4 space-y-4', className)}>{children}</div>
			</div>
		</ScrollArea>
	);
}