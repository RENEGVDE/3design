'use client';

import React from 'react';
import { Globe, Focus, Compass, Map, ZoomIn, RotateCw } from 'lucide-react';
import { I18N } from '../i18n/translations';
import { cn } from '../utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const CAMERA_BUTTONS = [
  { key: 'overview', Icon: Globe, i18nKey: 'camOverview' },
  { key: 'front', Icon: Focus, i18nKey: 'camFront' },
  { key: 'side', Icon: Compass, i18nKey: 'camSide' },
  { key: 'top', Icon: Map, i18nKey: 'camTop' },
  { key: 'focus', Icon: ZoomIn, i18nKey: 'camFocus' },
];

export interface CameraPresetsBarProps {
  lang: string;
  onSelectCamera: (camKey: string) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
}

export default function CameraPresetsBar({
  lang,
  onSelectCamera,
  autoRotate,
  onToggleAutoRotate,
}: CameraPresetsBarProps) {
  const dict = I18N[lang] || I18N.ro;

  return (
    <div
      id="bottom-bar"
      className="pointer-events-auto fixed bottom-3 left-1/2 z-20 flex max-w-[96vw] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/12 bg-[#14171d]/90 px-2.5 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      {CAMERA_BUTTONS.map(({ key, Icon, i18nKey }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onSelectCamera(key)}
              className="inline-flex h-7.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-transparent bg-white/[0.05] px-2.5 text-[11px] font-semibold text-zinc-200 transition hover:border-white/15 hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 text-amber-400" />
              <span>{dict[i18nKey]}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{dict[i18nKey]}</TooltipContent>
        </Tooltip>
      ))}

      <div className="mx-0.5 h-4 w-px shrink-0 bg-white/10" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            id="btn-autorotate"
            onClick={onToggleAutoRotate}
            className={cn(
              'inline-flex h-7.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-semibold transition',
              autoRotate
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                : 'border-transparent bg-white/[0.05] text-zinc-200 hover:border-white/15 hover:bg-white/10'
            )}
          >
            <RotateCw className={cn('h-3.5 w-3.5', autoRotate && 'animate-spin')} />
            <span>{dict.autoRotate}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{dict.autoRotate}</TooltipContent>
      </Tooltip>
    </div>
  );
}
