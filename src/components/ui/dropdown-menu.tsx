'use client';

import * as React from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[900] min-w-[215px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0F1115]/96 p-1.5 text-[#F5F7FA] shadow-2xl backdrop-blur-xl',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#C9D1D9] outline-none transition-colors hover:bg-[#1C2027] hover:text-white focus:bg-[#1C2027] focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('my-1.5 h-px bg-white/10', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export const DropdownMenuLabel = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

