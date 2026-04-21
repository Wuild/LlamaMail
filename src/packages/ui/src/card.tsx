import {cva, VariantProps} from 'class-variance-authority';
import {Link, LinkProps} from 'react-router-dom';
import {cn} from './utils';

export const CardVariants = cva('', {
	variants: {
		variant: {
			default: 'rounded-xl border border-border bg-surface shadow-sm',
			outline: 'rounded-md border border-border',
		},

		size: {
			empty: 'p-0',
			sm: 'p-2',
			md: 'p-4',
			lg: 'p-8',
			xl: 'p-12',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'md',
	},
});

export type CardVariantProps = VariantProps<typeof CardVariants>;

export interface CardProps extends CardVariantProps {
	className?: string;
	header?: React.ReactNode;
	footer?: React.ReactNode;
	children?: React.ReactNode;
	onClick?: (e: React.MouseEvent<HTMLDivElement | HTMLAnchorElement | HTMLButtonElement>) => void;
	to?: LinkProps['to'];
}

export function Card({
						 header,
						 footer,
						 variant,
						 size,
						 className,
						 children,
						 onClick,
						 title,
						 to,
					 }: CardProps & {title?: React.ReactNode}) {
	const cardClassName = cn('panel', CardVariants({
		variant,
		size,
	}), className, 'text-inherit', 'relative block min-w-0', (to || onClick) && 'cursor-pointer transition-colors hover:bg-surface-muted');

	const actualHeader = header || (title && <h2 className="ui-text-primary text-base font-semibold">{title}</h2>);

	const content = (
		<>
			{actualHeader && <header className={"pb-2"}>{actualHeader}</header>}
			<main className="min-w-0 space-y-3">{children}</main>
			{footer && (
				<footer
					className={'flex min-w-0 flex-row gap-2 border-t border-border bg-surface-muted/50 p-2 text-sm'}
				>
					{footer}
				</footer>
			)}
		</>
	);

	if (to) {
		return (
			<Link to={to} className={cardClassName} onClick={onClick as any}>
				{content}
			</Link>
		);
	}

	return (
		<section className={cardClassName} onClick={onClick}>
			{content}
		</section>
	);
}