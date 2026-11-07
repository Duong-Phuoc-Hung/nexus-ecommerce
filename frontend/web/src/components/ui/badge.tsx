import * as React from 'react';
import { cn } from '../../lib/utils/index';

const badgeVariants = {
  default: 'border-transparent bg-brand-dark text-white',
  secondary: 'border-transparent bg-brand-soft text-brand-dark',
  outline: 'border-line bg-white text-ink',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  destructive: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

export type BadgeProps = React.ComponentProps<'span'> & {
  variant?: keyof typeof badgeVariants;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
