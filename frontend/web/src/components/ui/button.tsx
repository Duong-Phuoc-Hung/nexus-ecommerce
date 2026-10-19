'use client';

import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from '../../lib/utils/index';

// shadcn/ui Radix Button pattern, with the existing Nexus palette and 44px targets.
const variants = {
  default: 'bg-brand-dark text-white hover:bg-brand shadow-xs',
  outline: 'border border-line bg-white text-ink hover:bg-brand-soft hover:text-brand-dark',
  secondary: 'bg-brand-soft text-brand-dark hover:bg-red-100',
  ghost: 'hover:bg-brand-soft hover:text-brand-dark',
  link: 'text-brand-dark underline-offset-4 hover:underline',
};
const sizes = {
  default: 'min-h-11 px-5 py-2.5',
  sm: 'min-h-11 px-3 py-2',
  lg: 'min-h-12 px-6 py-3',
  icon: 'size-11 shrink-0',
  plain: '',
};
type ButtonProps = React.ComponentProps<'button'> & {
  asChild?: boolean;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
