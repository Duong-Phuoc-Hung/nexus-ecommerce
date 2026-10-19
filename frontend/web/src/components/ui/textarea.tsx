import * as React from 'react';
import { cn } from '../../lib/utils/index';
export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full min-w-0 rounded-xl border border-input bg-white px-3 py-3 text-base text-ink shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm',
        className,
      )}
      {...props}
    />
  );
}
