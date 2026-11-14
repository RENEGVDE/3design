'use client';

import React, { useState, useMemo } from 'react';
import {
  APPLIANCE_CATALOG,
  ApplianceDefinition,
  ApplianceInstance,
  ApplianceType
} from '../utils/applianceCatalog';

export interface ApplianceCatalogSectionProps {
  lang?: string;
  appliances: ApplianceInstance[];
  selectedApplianceId?: string | null;
  onAddAppliance: (def: ApplianceDefinition, finish: string) => void;
  onSelectAppliance: (id: string | null) => void;
  onDeleteAppliance: (id: string) => void;
}

export default function ApplianceCatalogSection({
  lang = 'ro',
  appliances = [],
  selectedApplianceId = null,
  onAddAppliance,
  onSelectAppliance,
  onDeleteAppliance
}: ApplianceCatalogSectionProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [activeCategory, setActiveCategory] = useState<'all' | 'cooking' | 'cleaning' | 'cooling' | 'ventilation'>('all');
  const [selectedFinishes, setSelectedFinishes] = useState<Record<string, string>>({});

  const filteredCatalog = useMemo(() => {
    if (activeCategory === 'all') return APPLIANCE_CATALOG;
    return APPLIANCE_CATALOG.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const totalPowerKw = useMemo(() => {
    return appliances.reduce((sum, item) => sum + (item.powerKw || 0), 0).toFixed(2);
  }, [appliances]);

  const handleFinishChange = (type: ApplianceType, finish: string) => {
    setSelectedFinishes((prev) => ({ ...prev, [type]: finish }));
  };

  return (
    <div className="flex flex-col gap-3" id="appliance-catalog-studio">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
        <span>🍳</span>
        <span>
          {isRo
            ? 'Electrocasnice & Tehnică Încorporabilă'
            : isRu
            ? 'Встраиваемая техника и оборудование'
            : 'Built-in Appliances Catalog'}
        </span>
      </div>

      <div className="text-[11px] leading-relaxed text-slate-400">
        {isRo
          ? 'Catalog complet de electrocasnice încorporabile cu geometrie CAD 3D, cote de nișă și racorduri tehnice (electricitate & sanitare).'
          : isRu
          ? 'Каталог встраиваемой техники с 3D моделями, монтажными размерами ниш и техническими подключениями.'
          : 'Full built-in appliances catalog with 3D CAD models, niche cutouts, and power/water connections.'}
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5">
        {[
          { id: 'all', label: isRo ? 'Toate' : isRu ? 'Все' : 'All' },
          { id: 'cooking', label: isRo ? 'Gătit' : isRu ? 'Приготовление' : 'Cooking' },
          { id: 'cleaning', label: isRo ? 'Spălare' : isRu ? 'Мойки & Посуда' : 'Cleaning' },
          { id: 'cooling', label: isRo ? 'Frigidere' : isRu ? 'Холод' : 'Cooling' },
          { id: 'ventilation', label: isRo ? 'Hote' : isRu ? 'Вытяжки' : 'Ventilation' }
        ].map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => setActiveCategory(cat.id as any)}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Catalog Grid */}
      <div className="flex flex-col gap-2.5 mb-2">
        {filteredCatalog.map((item) => {
          const currentFinish = selectedFinishes[item.type] || item.finishes[0] || 'Standard';
          return (
            <div
              key={item.type}
              className="flex flex-col gap-2 rounded-lg border border-slate-700/80 bg-slate-900/65 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-slate-50">
                    {isRo ? item.nameRo : isRu ? item.nameRu : item.nameEn}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Cote aparat: {item.defaultDimensions.width}×{item.defaultDimensions.depth}×{item.defaultDimensions.height} mm
                  </div>
                  <div className="text-[11px] text-sky-400">
                    Nișă necesară: {item.nicheDimensions.width}×{item.nicheDimensions.depth}×{item.nicheDimensions.height} mm
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1 text-right">
                  {item.powerKw > 0 && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-red-400">
                      ⚡ {item.powerKw} kW
                    </span>
                  )}
                  {item.waterSupply && (
                    <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-sky-400">
                      💧 Apă
                    </span>
                  )}
                </div>
              </div>

              {/* Finishes and Add button */}
              <div className="flex items-center gap-2">
                {item.finishes.length > 1 && (
                  <select
                    value={currentFinish}
                    onChange={(e) => handleFinishChange(item.type, e.target.value)}
                    className="flex-1 rounded-md border border-white/10 bg-slate-950/70 px-2 py-1 text-[11.5px] text-slate-100 outline-none focus:border-sky-400"
                  >
                    {item.finishes.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-3 py-1.5 text-[11.5px] font-semibold text-slate-950 shadow-sm hover:brightness-110 transition cursor-pointer"
                  onClick={() => onAddAppliance(item, currentFinish)}
                >
                  <span>➕</span>
                  <span>{isRo ? 'Inserează în Scenă' : isRu ? 'Добавить' : 'Insert 3D'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Installed Appliances in Project */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-50">
            ⚡ {isRo ? `Electrocasnice în Proiect (${appliances.length})` : `Appliances in Scene (${appliances.length})`}
          </span>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-medium text-amber-300">
            Consum Total: {totalPowerKw} kW
          </span>
        </div>

        {appliances.length === 0 ? (
          <div className="py-1.5 text-[11.5px] italic text-slate-500">
            {isRo ? 'Niciun aparat electrocasnic adăugat în scenă încă.' : 'No appliances added to the scene yet.'}
          </div>
        ) : (
          <div className="flex max-h-[180px] flex-col gap-1.5 overflow-y-auto pr-0.5">
            {appliances.map((app) => {
              const isSelected = selectedApplianceId === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => onSelectAppliance(app.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-md border px-2 py-1.5 transition-colors ${
                    isSelected
                      ? 'border-sky-400 bg-sky-500/20'
                      : 'border-slate-700/80 bg-slate-800/60 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-50">{app.name}</div>
                    <div className="text-[10.5px] text-slate-400">
                      {app.finish} • {app.powerKw > 0 ? `${app.powerKw} kW` : 'Instalație'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAppliance(app.id);
                    }}
                    className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer"
                    title="Remove Appliance"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

