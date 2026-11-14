'use client';

import React from 'react';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import {
  RoomConfig,
  ArchitecturalOpening,
  DEFAULT_ROOM_CONFIG,
  FLOOR_FINISHES
} from '../utils/architecturalRoom';

export interface ArchitecturalRoomSectionProps {
  lang?: string;
  roomConfig: RoomConfig;
  onChangeRoomConfig: (newConfig: RoomConfig) => void;
  onOpen2DPlanView?: () => void;
}

const WALL_COLORS = [
  { hex: '#f4f4f2', name: 'Alb Clasic Cald' },
  { hex: '#e2d9cc', name: 'Greige / Crem Elegant' },
  { hex: '#cbd5e1', name: 'Gri Perlat' },
  { hex: '#252932', name: 'Antracit Modern' },
  { hex: '#1e293b', name: 'Navy Slate' }
];

const ROOM_PRESETS = [
  {
    nameRo: 'Bucătărie Apartament (3.5 × 4.5 m)',
    nameEn: 'Apartment Kitchen (3.5 × 4.5 m)',
    nameRu: 'Кухня в квартире (3.5 × 4.5 м)',
    widthCm: 350,
    lengthCm: 450,
    heightCm: 265
  },
  {
    nameRo: 'Open Space Living + Bucătărie (5.5 × 6.5 m)',
    nameEn: 'Open Space Living + Kitchen (5.5 × 6.5 m)',
    nameRu: 'Гостиная + кухня (5.5 × 6.5 м)',
    widthCm: 550,
    lengthCm: 650,
    heightCm: 275
  },
  {
    nameRo: 'Studio Garsonieră (4.0 × 5.0 m)',
    nameEn: 'Studio Apartment (4.0 × 5.0 m)',
    nameRu: 'Студия (4.0 × 5.0 м)',
    widthCm: 400,
    lengthCm: 500,
    heightCm: 265
  },
  {
    nameRo: 'Vilă Living Spațios (6.5 × 8.0 m)',
    nameEn: 'Spacious Villa Hall (6.5 × 8.0 m)',
    nameRu: 'Просторный коттедж (6.5 × 8.0 м)',
    widthCm: 650,
    lengthCm: 800,
    heightCm: 290
  }
];

export default function ArchitecturalRoomSection({
  lang = 'ro',
  roomConfig = DEFAULT_ROOM_CONFIG,
  onChangeRoomConfig,
  onOpen2DPlanView
}: ArchitecturalRoomSectionProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const updateConfig = (partial: Partial<RoomConfig>) => {
    onChangeRoomConfig({
      ...roomConfig,
      ...partial
    });
  };

  const handleAddDoor = () => {
    const newOpening: ArchitecturalOpening = {
      id: `door_${Date.now()}`,
      type: 'door',
      wallSide: 'front',
      distanceCm: Math.round(roomConfig.widthCm / 2 - 45),
      widthCm: 90,
      heightCm: 210,
      elevationCm: 0,
      name: 'Ușă Interioară (90×210)'
    };
    updateConfig({ openings: [...(roomConfig.openings || []), newOpening] });
  };

  const handleAddWindow = () => {
    const newOpening: ArchitecturalOpening = {
      id: `win_${Date.now()}`,
      type: 'window',
      wallSide: 'back',
      distanceCm: Math.round(roomConfig.widthCm / 2 - 70),
      widthCm: 140,
      heightCm: 140,
      elevationCm: 85,
      name: 'Fereastră Cameră (140×140)'
    };
    updateConfig({ openings: [...(roomConfig.openings || []), newOpening] });
  };

  const handleRemoveOpening = (id: string) => {
    updateConfig({
      openings: (roomConfig.openings || []).filter((op) => op.id !== id)
    });
  };

  return (
    <div className="flex flex-col gap-3.5" id="architectural-room-studio">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
        <span>🏠</span>
        <span>
          {isRo
            ? 'Spațiu & Arhitectură Încăpere'
            : isRu
            ? 'Помещение и архитектура'
            : 'Architectural Room & Space'}
        </span>
      </div>

      <div className="text-[11px] leading-relaxed text-slate-400">
        {isRo
          ? 'Proiectează spațiul arhitectural de la 0: dimensiuni pereți, goluri uși/ferestre, parchet, gresie și schiță 2D a locuinței.'
          : isRu
          ? 'Проектируйте помещение с нуля: размеры стен, проёмы дверей и окон, напольные покрытия и 2D план.'
          : 'Design the architectural room from scratch: parametric walls, doors, windows, flooring and 2D floor plan.'}
      </div>

      {/* 2D Plan Switcher Button */}
      {onOpen2DPlanView && (
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 p-2.5 text-xs font-bold text-slate-950 shadow-sm hover:brightness-110 transition cursor-pointer"
          onClick={onOpen2DPlanView}
        >
          <span>📐</span>
          <span>{isRo ? 'Deschide Schiță 2D Plan Arhitectural' : isRu ? 'Открыть 2D план помещения' : 'Open 2D Architectural Plan'}</span>
        </button>
      )}

      {/* 3D Space & Walls Visibility Toggles */}
      <div className="rounded-lg border border-slate-700/80 bg-slate-800/50 p-2.5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isRo ? 'Vizibilitate Spațiu 3D:' : isRu ? 'Отображение в 3D:' : '3D Space Visibility:'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
              roomConfig.showWalls
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
            onClick={() => updateConfig({ showWalls: !roomConfig.showWalls })}
          >
            <span>🧱</span>
            <span>{roomConfig.showWalls ? (isRo ? 'Pereți 3D: ON' : 'Walls 3D: ON') : (isRo ? 'Pereți 3D: OFF' : 'Walls 3D: OFF')}</span>
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
              roomConfig.showFloor
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
            onClick={() => updateConfig({ showFloor: !roomConfig.showFloor })}
          >
            <span>🪵</span>
            <span>{roomConfig.showFloor ? (isRo ? 'Pardoseală: ON' : 'Floor: ON') : (isRo ? 'Pardoseală: OFF' : 'Floor: OFF')}</span>
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isRo ? 'Șabloane Rapide Dimensiuni:' : isRu ? 'Быстрые шаблоны комнат:' : 'Quick Room Presets:'}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ROOM_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() =>
                updateConfig({
                  widthCm: p.widthCm,
                  lengthCm: p.lengthCm,
                  heightCm: p.heightCm
                })
              }
            >
              {isRo ? p.nameRo : isRu ? p.nameRu : p.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Room Dimensions */}
      <div className="flex flex-col gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isRo ? '1. Dimensiuni Încăpere (cm):' : isRu ? '1. Размеры комнаты (см):' : '1. Room Dimensions (cm):'}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{isRo ? 'Lățime Cameră (Axa X):' : 'Room Width (X):'}</span>
            <strong className="font-mono text-sky-400">{roomConfig.widthCm} cm ({(roomConfig.widthCm / 100).toFixed(2)} m)</strong>
          </div>
          <Slider
            min={200}
            max={1200}
            step={10}
            value={[roomConfig.widthCm]}
            onValueChange={(vals) => updateConfig({ widthCm: vals[0] ?? 200 })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{isRo ? 'Lungime Cameră (Axa Z):' : 'Room Length (Z):'}</span>
            <strong className="font-mono text-sky-400">{roomConfig.lengthCm} cm ({(roomConfig.lengthCm / 100).toFixed(2)} m)</strong>
          </div>
          <Slider
            min={200}
            max={1500}
            step={10}
            value={[roomConfig.lengthCm]}
            onValueChange={(vals) => updateConfig({ lengthCm: vals[0] ?? 200 })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{isRo ? 'Înălțime Tavan (Axa Y):' : 'Ceiling Height (Y):'}</span>
            <strong className="font-mono text-sky-400">{roomConfig.heightCm} cm ({(roomConfig.heightCm / 100).toFixed(2)} m)</strong>
          </div>
          <Slider
            min={220}
            max={450}
            step={5}
            value={[roomConfig.heightCm]}
            onValueChange={(vals) => updateConfig({ heightCm: vals[0] ?? 220 })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{isRo ? 'Grosime Pereți:' : 'Wall Thickness:'}</span>
            <strong className="font-mono text-sky-400">{roomConfig.wallThicknessCm} cm</strong>
          </div>
          <Slider
            min={10}
            max={40}
            step={5}
            value={[roomConfig.wallThicknessCm]}
            onValueChange={(vals) => updateConfig({ wallThicknessCm: vals[0] ?? 10 })}
          />
        </div>
      </div>

      {/* Surface Finishes: Flooring & Wall Color */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isRo ? '2. Finisaj Pardoseală:' : isRu ? '2. Напольное покрытие:' : '2. Flooring Material:'}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {FLOOR_FINISHES.map((f) => {
            const active = roomConfig.floorFinish === f.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'border-sky-400/60 bg-sky-500/15 text-sky-400'
                    : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                }`}
                onClick={() => updateConfig({ floorFinish: f.id as any })}
              >
                {isRo ? f.nameRo : isRu ? f.nameRu : f.nameEn}
              </button>
            );
          })}
        </div>

        {/* Baseboard Toggle */}
        <label className="mt-2.5 flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-200">
          <span>{isRo ? 'Plintă Perimetrală Pardoseală (80mm)' : 'Floor Baseboard (80mm)'}</span>
          <Switch
            checked={roomConfig.showBaseboards !== false}
            onCheckedChange={(checked) => updateConfig({ showBaseboards: checked })}
          />
        </label>
      </div>

      {/* Wall Paint Color */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isRo ? '3. Culoare Lavabilă Pereți:' : isRu ? '3. Цвет стен:' : '3. Wall Paint Color:'}
        </div>
        <div className="flex items-center gap-2">
          {WALL_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => updateConfig({ wallColor: c.hex })}
              className={`h-8 w-8 rounded-full transition-transform hover:scale-105 cursor-pointer ${
                roomConfig.wallColor === c.hex
                  ? 'border-[3px] border-sky-400'
                  : 'border-2 border-slate-600'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
          <input
            type="color"
            value={roomConfig.wallColor}
            onChange={(e) => updateConfig({ wallColor: e.target.value })}
            className="h-9 w-9 cursor-pointer rounded-md border-0 bg-transparent"
            title="Custom Wall Color"
          />
        </div>
      </div>

      {/* Openings Manager (Doors & Windows) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            🚪 {isRo ? `Goluri Uși & Ferestre (${(roomConfig.openings || []).length})` : `Openings (${(roomConfig.openings || []).length})`}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={handleAddDoor}
            >
              ➕ {isRo ? 'Ușă' : 'Door'}
            </button>
            <button
              type="button"
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={handleAddWindow}
            >
              ➕ {isRo ? 'Fereastră' : 'Window'}
            </button>
          </div>
        </div>

        {(roomConfig.openings || []).map((op, idx) => (
          <div
            key={op.id || idx}
            className="mb-1.5 flex flex-col gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/60 px-2.5 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-50">
                {op.type === 'door' ? '🚪 Ușă' : '🪟 Fereastră'} #{idx + 1} ({op.wallSide})
              </span>
              <button
                type="button"
                onClick={() => handleRemoveOpening(op.id)}
                className="rounded px-1 text-xs text-red-400 hover:bg-red-500/15 cursor-pointer"
                title="Remove Opening"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <div>
                <label className="mb-0.5 block text-slate-400">Perete:</label>
                <select
                  value={op.wallSide}
                  onChange={(e) => {
                    const ops = [...roomConfig.openings];
                    ops[idx].wallSide = e.target.value as any;
                    updateConfig({ openings: ops });
                  }}
                  className="w-full rounded border border-white/15 bg-slate-950/75 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-400"
                >
                  <option value="front">Frontal</option>
                  <option value="back">Spate</option>
                  <option value="left">Stânga</option>
                  <option value="right">Dreapta</option>
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-slate-400">Distanță (cm):</label>
                <input
                  type="number"
                  value={op.distanceCm}
                  onChange={(e) => {
                    const ops = [...roomConfig.openings];
                    ops[idx].distanceCm = Number(e.target.value);
                    updateConfig({ openings: ops });
                  }}
                  className="w-full rounded border border-white/15 bg-slate-950/75 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-slate-400">Lățime (cm):</label>
                <input
                  type="number"
                  value={op.widthCm}
                  onChange={(e) => {
                    const ops = [...roomConfig.openings];
                    ops[idx].widthCm = Number(e.target.value);
                    updateConfig({ openings: ops });
                  }}
                  className="w-full rounded border border-white/15 bg-slate-950/75 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
