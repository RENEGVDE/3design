'use client';

import React from 'react';
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
    <div className="side-section" id="architectural-room-studio">
      <div className="section-title">
        <span>🏠</span>
        <span>
          {isRo
            ? 'Spațiu & Arhitectură Încăpere'
            : isRu
            ? 'Помещение и архитектура'
            : 'Architectural Room & Space'}
        </span>
      </div>

      <div className="section-subtitle">
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
          className="btn-primary"
          style={{ width: '100%', marginBottom: '14px', padding: '10px' }}
          onClick={onOpen2DPlanView}
        >
          <span>📐</span>
          <span>{isRo ? 'Deschide Schiță 2D Plan Arhitectural' : isRu ? 'Открыть 2D план помещения' : 'Open 2D Architectural Plan'}</span>
        </button>
      )}

      {/* 3D Space & Walls Visibility Toggles */}
      <div style={{ marginBottom: '14px', background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
          {isRo ? 'Vizibilitate Spațiu 3D:' : isRu ? 'Отображение в 3D:' : '3D Space Visibility:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            className={`btn-pill ${roomConfig.showWalls ? 'active' : ''}`}
            onClick={() => updateConfig({ showWalls: !roomConfig.showWalls })}
            style={{ padding: '8px 10px', borderRadius: '6px', textAlign: 'center' }}
          >
            <span>🧱</span>
            <span>{roomConfig.showWalls ? (isRo ? 'Pereți 3D: ON' : 'Walls 3D: ON') : (isRo ? 'Pereți 3D: OFF' : 'Walls 3D: OFF')}</span>
          </button>
          <button
            type="button"
            className={`btn-pill ${roomConfig.showFloor ? 'active' : ''}`}
            onClick={() => updateConfig({ showFloor: !roomConfig.showFloor })}
            style={{ padding: '8px 10px', borderRadius: '6px', textAlign: 'center' }}
          >
            <span>🪵</span>
            <span>{roomConfig.showFloor ? (isRo ? 'Pardoseală: ON' : 'Floor: ON') : (isRo ? 'Pardoseală: OFF' : 'Floor: OFF')}</span>
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
          {isRo ? 'Șabloane Rapide Dimensiuni:' : isRu ? 'Быстрые шаблоны комнат:' : 'Quick Room Presets:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {ROOM_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-pill"
              style={{ padding: '6px 8px', textAlign: 'left', fontSize: '0.72rem' }}
              onClick={() =>
                updateConfig({
                  widthCm: p.widthCm,
                  lengthCm: p.lengthCm,
                  heightCm: p.heightCm
                })
              }
            >
              <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{isRo ? p.nameRo : isRu ? p.nameRu : p.nameEn}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Room Dimensions */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
          {isRo ? '1. Dimensiuni Încăpere (cm):' : isRu ? '1. Размеры комнаты (см):' : '1. Room Dimensions (cm):'}
        </div>

        <div className="slider-row">
          <div className="slider-header">
            <span>{isRo ? 'Lățime Cameră (Axa X):' : 'Room Width (X):'}</span>
            <strong style={{ color: '#38bdf8' }}>{roomConfig.widthCm} cm ({(roomConfig.widthCm / 100).toFixed(2)} m)</strong>
          </div>
          <input
            type="range"
            min="200"
            max="1200"
            step="10"
            value={roomConfig.widthCm}
            onChange={(e) => updateConfig({ widthCm: Number(e.target.value) })}
            className="styled-slider"
          />
        </div>

        <div className="slider-row">
          <div className="slider-header">
            <span>{isRo ? 'Lungime Cameră (Axa Z):' : 'Room Length (Z):'}</span>
            <strong style={{ color: '#38bdf8' }}>{roomConfig.lengthCm} cm ({(roomConfig.lengthCm / 100).toFixed(2)} m)</strong>
          </div>
          <input
            type="range"
            min="200"
            max="1500"
            step="10"
            value={roomConfig.lengthCm}
            onChange={(e) => updateConfig({ lengthCm: Number(e.target.value) })}
            className="styled-slider"
          />
        </div>

        <div className="slider-row">
          <div className="slider-header">
            <span>{isRo ? 'Înălțime Tavan (Axa Y):' : 'Ceiling Height (Y):'}</span>
            <strong style={{ color: '#38bdf8' }}>{roomConfig.heightCm} cm ({(roomConfig.heightCm / 100).toFixed(2)} m)</strong>
          </div>
          <input
            type="range"
            min="220"
            max="450"
            step="5"
            value={roomConfig.heightCm}
            onChange={(e) => updateConfig({ heightCm: Number(e.target.value) })}
            className="styled-slider"
          />
        </div>

        <div className="slider-row">
          <div className="slider-header">
            <span>{isRo ? 'Grosime Pereți:' : 'Wall Thickness:'}</span>
            <strong style={{ color: '#38bdf8' }}>{roomConfig.wallThicknessCm} cm</strong>
          </div>
          <input
            type="range"
            min="10"
            max="40"
            step="5"
            value={roomConfig.wallThicknessCm}
            onChange={(e) => updateConfig({ wallThicknessCm: Number(e.target.value) })}
            className="styled-slider"
          />
        </div>
      </div>

      {/* Surface Finishes: Flooring & Wall Color */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
          {isRo ? '2. Finisaj Pardoseală:' : isRu ? '2. Напольное покрытие:' : '2. Flooring Material:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {FLOOR_FINISHES.map((f) => {
            const active = roomConfig.floorFinish === f.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`btn-pill ${active ? 'active' : ''}`}
                style={{ padding: '8px 10px', textAlign: 'left', borderRadius: '8px' }}
                onClick={() => updateConfig({ floorFinish: f.id as any })}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: active ? '#38bdf8' : '#f1f5f9' }}>
                  {isRo ? f.nameRo : isRu ? f.nameRu : f.nameEn}
                </div>
              </button>
            );
          })}
        </div>

        {/* Baseboard Toggle */}
        <label className="toggle-label-box" style={{ marginTop: '10px' }}>
          <input
            type="checkbox"
            checked={roomConfig.showBaseboards !== false}
            onChange={(e) => updateConfig({ showBaseboards: e.target.checked })}
          />
          <span>{isRo ? 'Plintă Perimetrală Pardoseală (80mm)' : 'Floor Baseboard (80mm)'}</span>
        </label>
      </div>

      {/* Wall Paint Color */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
          {isRo ? '3. Culoare Lavabilă Pereți:' : isRu ? '3. Цвет стен:' : '3. Wall Paint Color:'}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {WALL_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => updateConfig({ wallColor: c.hex })}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: roomConfig.wallColor === c.hex ? '3px solid #38bdf8' : '2px solid #475569',
                cursor: 'pointer'
              }}
              title={c.name}
            />
          ))}
          <input
            type="color"
            value={roomConfig.wallColor}
            onChange={(e) => updateConfig({ wallColor: e.target.value })}
            style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
            title="Custom Wall Color"
          />
        </div>
      </div>

      {/* Openings Manager (Doors & Windows) */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            🚪 {isRo ? `Goluri Uși & Ferestre (${(roomConfig.openings || []).length})` : `Openings (${(roomConfig.openings || []).length})`}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
              onClick={handleAddDoor}
            >
              ➕ {isRo ? 'Ușă' : 'Door'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
              onClick={handleAddWindow}
            >
              ➕ {isRo ? 'Fereastră' : 'Window'}
            </button>
          </div>
        </div>

        {(roomConfig.openings || []).map((op, idx) => (
          <div
            key={op.id || idx}
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '8px 10px',
              marginBottom: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#f8fafc' }}>
                {op.type === 'door' ? '🚪 Ușă' : '🪟 Fereastră'} #{idx + 1} ({op.wallSide})
              </span>
              <button
                type="button"
                onClick={() => handleRemoveOpening(op.id)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                title="Remove Opening"
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.7rem' }}>
              <div>
                <label style={{ color: '#94a3b8', display: 'block' }}>Perete:</label>
                <select
                  value={op.wallSide}
                  onChange={(e) => {
                    const ops = [...roomConfig.openings];
                    ops[idx].wallSide = e.target.value as any;
                    updateConfig({ openings: ops });
                  }}
                  className="param-input"
                  style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                >
                  <option value="front">Frontal</option>
                  <option value="back">Spate</option>
                  <option value="left">Stânga</option>
                  <option value="right">Dreapta</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', display: 'block' }}>Distanță (cm):</label>
                <input
                  type="number"
                  value={op.distanceCm}
                  onChange={(e) => {
                    const ops = [...roomConfig.openings];
                    ops[idx].distanceCm = Number(e.target.value);
                    updateConfig({ openings: ops });
                  }}
                  className="param-input"
                  style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', display: 'block' }}>Lățime (cm):</label>
                <input
                  type="number"
                  value={op.widthCm}
                  onChange={(e) => {
                    const ops = [...roomConfig.openings];
                    ops[idx].widthCm = Number(e.target.value);
                    updateConfig({ openings: ops });
                  }}
                  className="param-input"
                  style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
