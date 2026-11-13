'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'gold' | 'cyan' | 'rose' | 'emerald' | 'purple' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => {
    const variants: Record<string, string> = {
      default:
        'bg-white/[0.06] hover:bg-white/[0.11] text-zinc-100 border border-white/10 shadow-sm',
      gold:
        'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(212,163,89,0.12)]',
      cyan:
        'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.12)]',
      rose:
        'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
      emerald:
        'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40',
      purple:
        'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40',
      ghost:
        'bg-transparent hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-transparent',
      danger:
        'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/40',
    };

    const sizes: Record<string, string> = {
      sm: 'h-7 px-2.5 text-[11px] rounded-lg gap-1.5',
      md: 'h-8 px-3 text-xs rounded-[10px] gap-1.5',
      lg: 'h-10 px-4 text-sm rounded-xl gap-2',
      icon: 'h-8 w-8 rounded-[10px] justify-center',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

