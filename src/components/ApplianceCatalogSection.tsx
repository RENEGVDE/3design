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
    <div className="side-section" id="appliance-catalog-studio">
      <div className="section-title">
        <span>🍳</span>
        <span>
          {isRo
            ? 'Electrocasnice & Tehnică Încorporabilă'
            : isRu
            ? 'Встраиваемая техника и оборудование'
            : 'Built-in Appliances Catalog'}
        </span>
      </div>

      <div className="section-subtitle">
        {isRo
          ? 'Catalog complet de electrocasnice încorporabile cu geometrie CAD 3D, cote de nișă și racorduri tehnice (electricitate & sanitare).'
          : isRu
          ? 'Каталог встраиваемой техники с 3D моделями, монтажными размерами ниш и техническими подключениями.'
          : 'Full built-in appliances catalog with 3D CAD models, niche cutouts, and power/water connections.'}
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '12px' }}>
        {[
          { id: 'all', label: isRo ? 'Toate' : isRu ? 'Все' : 'All' },
          { id: 'cooking', label: isRo ? 'Gătit' : isRu ? 'Приготовление' : 'Cooking' },
          { id: 'cleaning', label: isRo ? 'Spălare' : isRu ? 'Мойки & Посуда' : 'Cleaning' },
          { id: 'cooling', label: isRo ? 'Frigidere' : isRu ? 'Холод' : 'Cooling' },
          { id: 'ventilation', label: isRo ? 'Hote' : isRu ? 'Вытяжки' : 'Ventilation' }
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`btn-pill ${activeCategory === cat.id ? 'active' : ''}`}
            style={{ fontSize: '0.72rem', padding: '5px 10px', whiteSpace: 'nowrap' }}
            onClick={() => setActiveCategory(cat.id as any)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Catalog Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {filteredCatalog.map((item) => {
          const currentFinish = selectedFinishes[item.type] || item.finishes[0] || 'Standard';
          return (
            <div
              key={item.type}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                    {isRo ? item.nameRo : isRu ? item.nameRu : item.nameEn}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                    Cote aparat: {item.defaultDimensions.width}×{item.defaultDimensions.depth}×{item.defaultDimensions.height} mm
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#38bdf8' }}>
                    Nișă necesară: {item.nicheDimensions.width}×{item.nicheDimensions.depth}×{item.nicheDimensions.height} mm
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {item.powerKw > 0 && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      ⚡ {item.powerKw} kW
                    </span>
                  )}
                  {item.waterSupply && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px', fontWeight: 600 }}>
                      💧 Apă
                    </span>
                  )}
                </div>
              </div>

              {/* Finishes and Add button */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {item.finishes.length > 1 && (
                  <select
                    value={currentFinish}
                    onChange={(e) => handleFinishChange(item.type, e.target.value)}
                    className="param-input"
                    style={{ fontSize: '0.72rem', flex: 1, padding: '4px 6px' }}
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
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.74rem', marginLeft: 'auto' }}
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
      <div className="bom-metrics-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
            ⚡ {isRo ? `Electrocasnice în Proiect (${appliances.length})` : `Appliances in Scene (${appliances.length})`}
          </span>
          <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px' }}>
            Consum Total: {totalPowerKw} kW
          </span>
        </div>

        {appliances.length === 0 ? (
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
            {isRo ? 'Niciun aparat electrocasnic adăugat în scenă încă.' : 'No appliances added to the scene yet.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {appliances.map((app) => {
              const isSelected = selectedApplianceId === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => onSelectAppliance(app.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#f8fafc' }}>{app.name}</div>
                    <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                      {app.finish} • {app.powerKw > 0 ? `${app.powerKw} kW` : 'Instalație'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAppliance(app.id);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px' }}
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

