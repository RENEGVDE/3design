'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';

export interface ModelTreePanelProps {
  lang?: string;
  importedModels?: any[];
  appliances?: any[];
  explodedProgress?: number;
  onChangeExplodedProgress?: (val: number) => void;
  showFasteners3d?: boolean;
  onToggleFasteners3d?: () => void;
  wireframeActive?: boolean;
  onToggleWireframe?: () => void;
  selectedPartId?: string | null;
  onSelectPart?: (id: string | null) => void;
  onTogglePartVisibility?: (id: string) => void;
  hiddenPartIds?: Set<string>;
  onAddCustomPanel?: (config: any) => void;
  onDeleteModel?: (id: string) => void;
}

export default function ModelTreePanel({
  lang = 'ro',
  importedModels = [],
  appliances = [],
  explodedProgress = 0,
  onChangeExplodedProgress,
  showFasteners3d = false,
  onToggleFasteners3d,
  wireframeActive = false,
  onToggleWireframe,
  selectedPartId = null,
  onSelectPart,
  onTogglePartVisibility,
  hiddenPartIds = new Set(),
  onAddCustomPanel,
  onDeleteModel
}: ModelTreePanelProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    root: true,
    furnitureModels: true,
    appliancesNode: true
  });

  const [newPanelModalOpen, setNewPanelModalOpen] = useState(false);
  const [newPanelConfig, setNewPanelConfig] = useState({
    name: 'Panou CAD Personalizat',
    orientation: 'horizontal', // 'horizontal' | 'vertical' | 'frontal'
    lengthMm: 600,
    widthMm: 400,
    thicknessMm: 18,
    edgeBanding: 'Cant ABS 1mm',
    material: 'PAL Melaminat Alb 18mm'
  });

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  const handleCreatePanel = () => {
    if (onAddCustomPanel) {
      onAddCustomPanel(newPanelConfig);
    }
    setNewPanelModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Quick Add Custom Panel Action */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5">
        <div>
          <strong className="block text-[13px] font-bold text-slate-50">
            {isRo ? 'Corpuri & Piese CAD' : isRu ? 'Модули и детали CAD' : 'CAD Modules & Panels'}
          </strong>
          <small className="text-[11px] text-slate-400">
            {importedModels.length} {isRo ? 'corpuri de mobilier în scenă' : 'cabinets in scene'}
          </small>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-950 whitespace-nowrap hover:brightness-110 transition cursor-pointer"
          onClick={() => setNewPanelModalOpen(true)}
        >
          <span>➕</span>
          <span>{isRo ? 'Panou Liber' : isRu ? 'Добавить деталь' : 'Add Panel'}</span>
        </button>
      </div>

      {/* Hierarchical Model Structural Tree */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/25 px-3 py-2 text-xs font-bold text-slate-100">
          <span className="text-base">🌲</span>
          <strong>{isRo ? 'Arbore Structură Model' : isRu ? 'Структурное дерево модели' : 'Model Structure Tree'}</strong>
        </div>

        <div className="max-h-[460px] overflow-y-auto p-2 text-xs">
          {/* Root Project Node */}
          <div>
            <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-slate-100 hover:bg-white/5">
              <button
                type="button"
                className="w-4 text-center text-[10px] text-slate-400 hover:text-white cursor-pointer"
                onClick={() => toggleNode('root')}
              >
                {expandedNodes.root ? '▼' : '▶'}
              </button>
              <span>🏠</span>
              <span className="truncate font-semibold">
                {isRo ? 'Proiect Mobilier & Arhitectură' : isRu ? 'Проект интерьера и мебели' : 'Project Furniture & Architecture'}
              </span>
            </div>

            {expandedNodes.root && (
              <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-2 pt-1">
                {/* 1. Custom Imported & Parametric Furniture Modules Node */}
                <div>
                  <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-slate-200 hover:bg-white/5">
                    <button
                      type="button"
                      className="w-4 text-center text-[10px] text-slate-400 hover:text-white cursor-pointer"
                      onClick={() => toggleNode('furnitureModels')}
                    >
                      {expandedNodes.furnitureModels ? '▼' : '▶'}
                    </button>
                    <span>📦</span>
                    <span className="truncate font-semibold">
                      {isRo ? 'Corpuri de Mobilier Parametrice' : isRu ? 'Параметрические модули мебели' : 'Furniture Cabinets'}
                      <small className="ml-1.5 text-slate-400">({importedModels.length})</small>
                    </span>
                  </div>

                  {expandedNodes.furnitureModels && (
                    <div className="ml-3 flex flex-col gap-1.5 border-l border-white/10 pl-2 pt-1">
                      {importedModels.length === 0 ? (
                        <div className="px-3 py-1.5 text-[11px] italic text-slate-500">
                          {isRo ? 'Niciun corp creat încă. Adaugă dulapuri, comode, dressinguri sau bucătării modulare.' : isRu ? 'Нет добавленных модулей. Создайте мебель во вкладке CAD.' : 'No custom cabinets yet. Create one in Furniture CAD tab.'}
                        </div>
                      ) : (
                        importedModels.map((model, idx) => {
                          const isHidden = hiddenPartIds.has(model.id);
                          const isSelected = selectedPartId === model.id;
                          const cuttingList = model.furnitureConfig?.panelCuttingList || model.panelCuttingList || [];

                          return (
                            <div
                              key={model.id || idx}
                              className={`overflow-hidden rounded-lg border transition-colors ${
                                isSelected
                                  ? 'border-sky-400/70 bg-sky-500/15'
                                  : 'border-white/10 bg-slate-950/60 hover:border-white/20'
                              }`}
                            >
                              <div
                                className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
                                onClick={() => onSelectPart && onSelectPart(model.id)}
                              >
                                <span>🛋️</span>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-xs font-semibold text-slate-100">
                                    {model.name || `Corp #${idx + 1}`}
                                  </div>
                                  <div className="truncate text-[10.5px] text-slate-400">
                                    {model.furnitureConfig?.category || 'Corp Mobilier'} • {cuttingList.length} {isRo ? 'piese' : 'repere'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="rounded px-1 py-0.5 text-xs hover:bg-white/10 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onTogglePartVisibility) onTogglePartVisibility(model.id);
                                  }}
                                  title={isHidden ? (isRo ? 'Arată' : 'Show') : (isRo ? 'Ascunde' : 'Hide')}
                                >
                                  {isHidden ? '🕶️' : '👁️'}
                                </button>
                                {onDeleteModel && (
                                  <button
                                    type="button"
                                    className="rounded px-1 py-0.5 text-xs text-red-400 hover:bg-red-500/15 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteModel(model.id);
                                    }}
                                    title={isRo ? 'Șterge corp' : 'Delete'}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {/* Sub-panels inside cabinet */}
                              {cuttingList.length > 0 && (
                                <div className="flex flex-col gap-0.5 border-t border-white/10 bg-black/25 px-2 py-1.5">
                                  {cuttingList.map((p: any, pIdx: number) => (
                                    <div key={pIdx} className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
                                      <span className="text-sky-400">▫</span>
                                      <span className="min-w-0 flex-1 truncate">{p.partName || p.name}</span>
                                      <span className="font-mono text-slate-400">
                                        {p.lengthMm || p.length}×{p.widthMm || p.width} mm
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Appliances Node */}
                <div>
                  <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-slate-200 hover:bg-white/5">
                    <button
                      type="button"
                      className="w-4 text-center text-[10px] text-slate-400 hover:text-white cursor-pointer"
                      onClick={() => toggleNode('appliancesNode')}
                    >
                      {expandedNodes.appliancesNode ? '▼' : '▶'}
                    </button>
                    <span>🍳</span>
                    <span className="truncate font-semibold">
                      {isRo ? 'Electrocasnice & Dotări Tehnice' : isRu ? 'Встраиваемая техника' : 'Built-in Appliances'}
                      <small className="ml-1.5 text-slate-400">({appliances.length})</small>
                    </span>
                  </div>

                  {expandedNodes.appliancesNode && (
                    <div className="ml-3 flex flex-col gap-1.5 border-l border-white/10 pl-2 pt-1">
                      {appliances.length === 0 ? (
                        <div className="px-3 py-1.5 text-[11px] italic text-slate-500">
                          {isRo ? 'Niciun aparat electrocasnic adăugat încă. Deschide secțiunea "Tehnică & Dotări".' : isRu ? 'Техника не добавлена.' : 'No appliances added yet.'}
                        </div>
                      ) : (
                        appliances.map((app, idx) => {
                          const isHidden = hiddenPartIds.has(app.id);
                          const isSelected = selectedPartId === app.id;
                          return (
                            <div
                              key={app.id || idx}
                              className={`overflow-hidden rounded-lg border transition-colors ${
                                isSelected
                                  ? 'border-sky-400/70 bg-sky-500/15'
                                  : 'border-white/10 bg-slate-950/60 hover:border-white/20'
                              }`}
                            >
                              <div
                                className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
                                onClick={() => onSelectPart && onSelectPart(app.id)}
                              >
                                <span>⚡</span>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-xs font-semibold text-slate-100">{app.name}</div>
                                  <div className="truncate text-[10.5px] text-slate-400">
                                    {app.dimensions?.width}×{app.dimensions?.height} mm • {app.powerKw > 0 ? `${app.powerKw} kW` : 'Plumbing'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="rounded px-1 py-0.5 text-xs hover:bg-white/10 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onTogglePartVisibility) onTogglePartVisibility(app.id);
                                  }}
                                  title={isHidden ? 'Arată' : 'Ascunde'}
                                >
                                  {isHidden ? '🕶️' : '👁️'}
                                </button>
                                {onDeleteModel && (
                                  <button
                                    type="button"
                                    className="rounded px-1 py-0.5 text-xs text-red-400 hover:bg-red-500/15 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteModel(app.id);
                                    }}
                                    title={isRo ? 'Șterge aparat' : 'Delete'}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Creating Custom Free Panel */}
      <Dialog open={newPanelModalOpen} onOpenChange={setNewPanelModalOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span>📐</span>
              <span>{isRo ? 'Adăugare Panou CAD Liber' : isRu ? 'Создать произвольную деталь' : 'Add Custom Panel'}</span>
            </DialogTitle>
            <DialogDescription>
              {isRo ? 'Specifică dimensiunile milimetrice și orientarea' : isRu ? 'Параметры детали в мм' : 'Specify mm dimensions'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-1">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                {isRo ? 'Denumire Piesă:' : isRu ? 'Название детали:' : 'Part Name:'}
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                value={newPanelConfig.name}
                onChange={(e) => setNewPanelConfig({ ...newPanelConfig, name: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                {isRo ? 'Orientare Spațială:' : isRu ? 'Ориентация в пространстве:' : 'Orientation:'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'horizontal', label: isRo ? 'Orizontal' : isRu ? 'Горизонт' : 'Horizontal' },
                  { id: 'vertical', label: isRo ? 'Vertical' : isRu ? 'Вертикаль' : 'Vertical' },
                  { id: 'frontal', label: isRo ? 'Frontal' : isRu ? 'Фронтально' : 'Frontal' }
                ].map((o) => {
                  const isActive = newPanelConfig.orientation === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                      onClick={() => setNewPanelConfig({ ...newPanelConfig, orientation: o.id })}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  {isRo ? 'Lungime (mm):' : isRu ? 'Длина (мм):' : 'Length (mm):'}
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                  value={newPanelConfig.lengthMm}
                  onChange={(e) => setNewPanelConfig({ ...newPanelConfig, lengthMm: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  {isRo ? 'Lățime (mm):' : isRu ? 'Ширина (мм):' : 'Width (mm):'}
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                  value={newPanelConfig.widthMm}
                  onChange={(e) => setNewPanelConfig({ ...newPanelConfig, widthMm: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  {isRo ? 'Grosime:' : isRu ? 'Толщина:' : 'Thickness:'}
                </label>
                <select
                  className="w-full rounded-lg border border-white/15 bg-slate-950/75 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                  value={newPanelConfig.thicknessMm}
                  onChange={(e) => setNewPanelConfig({ ...newPanelConfig, thicknessMm: Number(e.target.value) })}
                >
                  <option value={18}>18 mm (PAL standard)</option>
                  <option value={16}>16 mm (PAL subțire)</option>
                  <option value={10}>10 mm (PAL sertare)</option>
                  <option value={4}>4 mm (HDF spate)</option>
                  <option value={38}>38 mm (Blat lucru)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  {isRo ? 'Finisaj Cant:' : isRu ? 'Кромка:' : 'Edge Banding:'}
                </label>
                <select
                  className="w-full rounded-lg border border-white/15 bg-slate-950/75 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                  value={newPanelConfig.edgeBanding}
                  onChange={(e) => setNewPanelConfig({ ...newPanelConfig, edgeBanding: e.target.value })}
                >
                  <option value="Cant ABS 2mm">ABS 2 mm</option>
                  <option value="Cant ABS 1mm">ABS 1 mm</option>
                  <option value="Cant ABS 0.4mm">ABS 0.4 mm</option>
                  <option value="Fără cant">Fără cant</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-3 py-2 text-xs font-bold text-slate-950 hover:brightness-110 transition cursor-pointer"
              onClick={handleCreatePanel}
            >
              <span>➕</span>
              <span>{isRo ? 'Generează Panou în Scenă' : isRu ? 'Создать деталь' : 'Generate Panel in Scene'}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
