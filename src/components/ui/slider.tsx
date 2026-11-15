'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center py-1 cursor-pointer',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#262B34]">
      <SliderPrimitive.Range className="absolute h-full bg-[#0F5773]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border-2 border-[#0F5773] bg-white shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#0F5773]/60" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

