'use client';

import React from 'react';
import Sun from 'lucide-react/icons/sun';
import Sparkles from 'lucide-react/icons/sparkles';
import { I18N } from '../i18n/translations';
import { LIGHT_POS_PRESETS } from '../utils/textures';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';

export default function LightingStudioSection({
  lang,
  lightState,
  onChangeLightState,
  showLightOrb,
  onToggleLightOrb,
}) {
  const dict = I18N[lang] || I18N.ro;

  let kelvinTag = '';
  if (lightState.kelvin <= 3200) {
    kelvinTag = lang === 'ro' ? ' (Caldă)' : lang === 'ru' ? ' (Тёплый)' : ' (Warm)';
  } else if (lightState.kelvin <= 4600) {
    kelvinTag = lang === 'ro' ? ' (Neutră)' : lang === 'ru' ? ' (Нейтр.)' : ' (Neutral)';
  } else {
    kelvinTag = lang === 'ro' ? ' (Rece)' : lang === 'ru' ? ' (Холод.)' : ' (Cool)';
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
        <Sun className="h-4 w-4 text-[#C9D1D9]" />
        <span>{dict.lightStudioTitle}</span>
      </div>

      <div className="space-y-3.5 rounded-xl border border-white/[0.08] bg-[#14171C] p-3.5">
        {/* Kelvin */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C9D1D9]">{dict.lightKelvinLbl}</span>
            <span className="font-mono font-semibold text-[#F5F7FA]">{`${lightState.kelvin}K${kelvinTag}`}</span>
          </div>
          <Slider
            min={2700}
            max={6500}
            step={100}
            value={[lightState.kelvin]}
            onValueChange={([val]) => onChangeLightState({ kelvin: val || 4000 })}
          />
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              onClick={() => onChangeLightState({ kelvin: 2900 })}
            >
              <span>🌅</span>
              <span>{dict.kelvinWarm}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              onClick={() => onChangeLightState({ kelvin: 4000 })}
            >
              <span>☀️</span>
              <span>{dict.kelvinNeutral}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              onClick={() => onChangeLightState({ kelvin: 6000 })}
            >
              <span>❄️</span>
              <span>{dict.kelvinDaylight}</span>
            </button>
          </div>
        </div>

        {/* Main Light Intensity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C9D1D9]">{dict.lightIntensityLbl}</span>
            <span className="font-mono font-semibold text-[#F5F7FA]">{`${lightState.mainPct}%`}</span>
          </div>
          <Slider
            min={0}
            max={250}
            step={5}
            value={[lightState.mainPct]}
            onValueChange={([val]) => onChangeLightState({ mainPct: val })}
          />
        </div>

        {/* Ambient Intensity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C9D1D9]">{dict.ambientIntensityLbl}</span>
            <span className="font-mono font-semibold text-[#F5F7FA]">{`${lightState.ambientPct}%`}</span>
          </div>
          <Slider
            min={10}
            max={200}
            step={5}
            value={[lightState.ambientPct]}
            onValueChange={([val]) => onChangeLightState({ ambientPct: val })}
          />
        </div>

        {/* Light Position Presets */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">{dict.lightPointTitle}</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              onClick={() => onChangeLightState(LIGHT_POS_PRESETS.front_right)}
            >
              <span>↘️</span>
              <span>{dict.lposFrontRight}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              onClick={() => onChangeLightState(LIGHT_POS_PRESETS.front_left)}
            >
              <span>↙️</span>
              <span>{dict.lposFrontLeft}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              onClick={() => onChangeLightState(LIGHT_POS_PRESETS.ceiling)}
            >
              <span>⬆️</span>
              <span>{dict.lposCeiling}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              onClick={() => onChangeLightState(LIGHT_POS_PRESETS.window)}
            >
              <span>🪟</span>
              <span>{dict.lposWindow}</span>
            </button>
            <button
              type="button"
              className="col-span-2 inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              onClick={() => onChangeLightState(LIGHT_POS_PRESETS.low_dramatic)}
            >
              <span>🌇</span>
              <span>{dict.lposDramatic}</span>
            </button>
          </div>
        </div>

        {/* Angle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C9D1D9]">{dict.lightAngleLbl}</span>
            <span className="font-mono font-semibold text-[#F5F7FA]">{`${lightState.angleDeg}°`}</span>
          </div>
          <Slider
            min={-180}
            max={180}
            step={2}
            value={[lightState.angleDeg]}
            onValueChange={([val]) => onChangeLightState({ angleDeg: val })}
          />
        </div>

        {/* Height */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C9D1D9]">{dict.lightHeightLbl}</span>
            <span className="font-mono font-semibold text-[#F5F7FA]">{`${lightState.heightM.toFixed(1)}m`}</span>
          </div>
          <Slider
            min={0.8}
            max={6.5}
            step={0.1}
            value={[lightState.heightM]}
            onValueChange={([val]) => onChangeLightState({ heightM: val })}
          />
        </div>

        {/* Distance */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C9D1D9]">{dict.lightDistLbl}</span>
            <span className="font-mono font-semibold text-[#F5F7FA]">{`${lightState.distM.toFixed(1)}m`}</span>
          </div>
          <Slider
            min={1.5}
            max={7.0}
            step={0.1}
            value={[lightState.distM]}
            onValueChange={([val]) => onChangeLightState({ distM: val })}
          />
        </div>

        {/* Show Light Orb Switch (Radix UI Switch) */}
        <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#0F1115] px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#F5F7FA]">
            <Sparkles className="h-3.5 w-3.5 text-[#8B949E]" />
            <span>{dict.showLightOrbBtn}</span>
          </div>
          <Switch checked={Boolean(showLightOrb)} onCheckedChange={onToggleLightOrb} />
        </div>
      </div>
    </div>
  );
}
