import * as React from 'react';
import { cn } from '../../lib/utils/index';
export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex min-h-11 w-full min-w-0 rounded-xl border border-input bg-white px-3 py-2 text-base text-ink shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus-visible:border-sky-400 focus-visible:ring-0 focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}
