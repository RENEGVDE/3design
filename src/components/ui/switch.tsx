'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-white/10 bg-[#262B34] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5773]/60 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#1F3627] data-[state=checked]:border-[#355E43]',
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5'
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

