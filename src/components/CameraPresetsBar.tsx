'use client';

import React from 'react';
import Globe from 'lucide-react/icons/globe';
import Focus from 'lucide-react/icons/focus';
import Compass from 'lucide-react/icons/compass';
import Map from 'lucide-react/icons/map';
import ZoomIn from 'lucide-react/icons/zoom-in';
import RotateCw from 'lucide-react/icons/rotate-cw';
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
      className="pointer-events-auto fixed bottom-3 left-1/2 z-20 flex max-w-[96vw] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0F1115]/95 px-2 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-xl"
    >
      {CAMERA_BUTTONS.map(({ key, Icon, i18nKey }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onSelectCamera(key)}
              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-transparent bg-transparent px-2.5 text-[11px] font-medium text-[#C9D1D9] transition hover:border-white/[0.08] hover:bg-[#1C2027] hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 text-[#8B949E]" />
              <span>{dict[i18nKey]}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{dict[i18nKey]}</TooltipContent>
        </Tooltip>
      ))}

      <div className="mx-0.5 h-4 w-px shrink-0 bg-white/[0.08]" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            id="btn-autorotate"
            onClick={onToggleAutoRotate}
            className={cn(
              'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition',
              autoRotate
                ? 'border-[#17789E] bg-[#0F5773] text-white'
                : 'border-transparent bg-transparent text-[#C9D1D9] hover:border-white/[0.08] hover:bg-[#1C2027] hover:text-white'
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
