'use client';

import React, { useMemo, useState } from 'react';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import {
  FURNITURE_TEMPLATES,
  FurnitureAssembly,
  FurnitureTemplateId,
  CompartmentNode,
  CompartmentFill,
  CadPart,
  EdgeThickness,
  PartShape,
  createAssemblyFromTemplate,
  regenerateAssemblyParts,
  splitCompartmentNode,
  updateCompartmentNode,
  addManualPart,
  updateCadPart,
  duplicateCadPart,
  removeCadPart,
  computeAssemblyBom,
  createKitchenLayoutAssemblies,
  PlacedAssemblyUnit
} from '../utils/furnitureCadEngine';

export interface FurnitureCadStudioSectionProps {
  lang?: string;
  placedAssemblies?: Array<{ id: string; name: string; cadAssembly: FurnitureAssembly }>;
  selectedModelId?: string | null;
  selectedPartId?: string | null;
  onSelectModel?: (id: string) => void;
  onSelectPartId?: (partId: string | null) => void;
  onMountAssembly?: (
    assembly: FurnitureAssembly,
    position?: [number, number, number],
    rotationYDeg?: number
  ) => void;
  onMountMultipleAssemblies?: (units: PlacedAssemblyUnit[], title: string) => void;
  onUpdateAssembly?: (assemblyId: string, nextAssembly: FurnitureAssembly) => void;
  onDeleteAssembly?: (assemblyId: string) => void;
  onOpenTechnicalReport?: () => void;
}

type StudioMode = 'create' | 'structure' | 'parts' | 'kitchen';

const EDGE_OPTIONS: EdgeThickness[] = ['none', '0.4mm', '1mm', '2mm'];
const SHAPE_OPTIONS: Array<{ id: PartShape; label: string }> = [
  { id: 'rect', label: 'Dreptunghi' },
  { id: 'l_cut', label: 'Decupaj L' },
  { id: 'chamfer', label: 'Teșitură' },
  { id: 'rounded', label: 'Colț Rotund' },
  { id: 'mansard_slope', label: 'Pantă Mansardă' }
];

const FILL_OPTIONS: Array<{ id: CompartmentFill; label: string }> = [
  { id: 'open', label: 'Deschis' },
  { id: 'shelves', label: 'Polițe' },
  { id: 'drawers', label: 'Sertare' },
  { id: 'door_left', label: 'Ușă Stg' },
  { id: 'door_right', label: 'Ușă Dr' },
  { id: 'door_double', label: '2 Uși' },
  { id: 'door_lift', label: 'Rabatabil' },
  { id: 'door_sliding', label: 'Culisant' }
];

function collectLeafNodes(node: CompartmentNode, depth = 0): Array<{ node: CompartmentNode; depth: number }> {
  if (!node.splitAxis || !node.children || node.children.length === 0) {
    return [{ node, depth }];
  }
  return node.children.flatMap((c) => collectLeafNodes(c, depth + 1));
}

export default function FurnitureCadStudioSection({
  lang = 'ro',
  placedAssemblies = [],
  selectedModelId = null,
  selectedPartId = null,
  onSelectModel,
  onSelectPartId,
  onMountAssembly,
  onMountMultipleAssemblies,
  onUpdateAssembly,
  onDeleteAssembly,
  onOpenTechnicalReport
}: FurnitureCadStudioSectionProps) {
  const isRo = lang === 'ro';
  const [mode, setMode] = useState<StudioMode>('create');
  const [templateCat, setTemplateCat] = useState<string>('all');
  const [draftTemplateId, setDraftTemplateId] = useState<FurnitureTemplateId>('base_cabinet');

  // Multi-unit kitchen layout generator state
  const [kitchenLayout, setKitchenLayout] = useState<'linear' | 'l_corner' | 'u_shape' | 'l_peninsula'>('l_peninsula');
  const [mainWallCm, setMainWallCm] = useState(340);
  const [returnWallCm, setReturnWallCm] = useState(220);
  const [peninsulaCm, setPeninsulaCm] = useState(180);
  const [includeFridgeCol, setIncludeFridgeCol] = useState(true);
  const [includeOvenCol, setIncludeOvenCol] = useState(true);
  const [includeDishwasher, setIncludeDishwasher] = useState(true);

  const selectedEntry = useMemo(
    () => placedAssemblies.find((a) => a.id === selectedModelId) || null,
    [placedAssemblies, selectedModelId]
  );

  const activeAssembly: FurnitureAssembly | null = selectedEntry?.cadAssembly || null;

  const activePart: CadPart | null = useMemo(() => {
    if (!activeAssembly) return null;
    return (
      activeAssembly.parts.find((p) => p.id === selectedPartId) ||
      activeAssembly.parts[0] ||
      null
    );
  }, [activeAssembly, selectedPartId]);

  const bom = useMemo(
    () => (activeAssembly ? computeAssemblyBom(activeAssembly) : null),
    [activeAssembly]
  );

  const leafNodes = useMemo(
    () => (activeAssembly ? collectLeafNodes(activeAssembly.rootNode) : []),
    [activeAssembly]
  );

  const filteredTemplates = useMemo(() => {
    if (templateCat === 'all') return FURNITURE_TEMPLATES;
    return FURNITURE_TEMPLATES.filter((t) => t.category === templateCat);
  }, [templateCat]);

  const commitAssembly = (next: FurnitureAssembly, regen = false) => {
    if (!activeAssembly || !onUpdateAssembly) return;
    const finalAsm = regen ? regenerateAssemblyParts(next) : next;
    onUpdateAssembly(activeAssembly.id, finalAsm);
  };

  const handleInsertTemplate = (tId: FurnitureTemplateId) => {
    const meta = FURNITURE_TEMPLATES.find((t) => t.id === tId);
    const label = isRo ? meta?.nameRo : meta?.nameEn;
    const asm = createAssemblyFromTemplate(tId, label);
    const spawnX = 0.6 + placedAssemblies.length * 0.85;
    const spawnY = tId === 'upper_cabinet' || tId === 'bathroom_vanity' ? 1.4 : 0;
    onMountAssembly?.(asm, [spawnX, spawnY, 1.8], 0);
    setMode('structure');
  };

  const handleGenerateKitchenLayout = () => {
    const units = createKitchenLayoutAssemblies({
      layoutType: kitchenLayout,
      mainWallWidthMm: mainWallCm * 10,
      returnWallDepthMm: returnWallCm * 10,
      peninsulaLengthMm: peninsulaCm * 10,
      includeOvenCol,
      includeFridgeCol,
      includeDishwasher
    });
    onMountMultipleAssemblies?.(units, `Bucătărie Modulară (${units.length} corpuri)`);
  };

  const cardCls = 'rounded-xl border border-white/[0.08] bg-[#14171C] p-3 space-y-2.5';
  const inputCls =
    'w-full rounded-lg border border-[#262B34] bg-[#090A0C] px-2.5 py-1.5 text-xs text-[#F5F7FA] outline-none focus:border-[#0F5773]';
  const labelCls = 'block text-[11px] font-medium text-[#8B949E] mb-1';

  return (
    <div className="space-y-3">
      {/* Mode Switcher */}
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/[0.08] bg-[#090A0C] p-1">
        {(
          [
            { id: 'create', label: isRo ? 'Creează' : 'Create' },
            { id: 'structure', label: isRo ? 'Structură' : 'Bays' },
            { id: 'parts', label: isRo ? 'Piese CAD' : 'Parts' },
            { id: 'kitchen', label: isRo ? 'Bucătărie' : 'Room' }
          ] as Array<{ id: StudioMode; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`rounded-md py-1.5 text-[11px] font-semibold transition cursor-pointer ${
              mode === tab.id
                ? 'bg-[#0F5773] text-[#F5F7FA]'
                : 'text-[#8B949E] hover:text-[#F5F7FA]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Placed Assemblies Bar */}
      {placedAssemblies.length > 0 && (
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
              {isRo ? `Corpuri CAD în Scenă (${placedAssemblies.length})` : `Scene Units (${placedAssemblies.length})`}
            </span>
            {activeAssembly && onDeleteAssembly && (
              <button
                type="button"
                onClick={() => onDeleteAssembly(activeAssembly.id)}
                className="text-[11px] font-semibold text-red-400 hover:text-red-300 cursor-pointer"
              >
                {isRo ? 'Șterge Selectat' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {placedAssemblies.map((item) => {
              const active = item.id === activeAssembly?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectModel?.(item.id)}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                    active
                      ? 'border-[#17789E] bg-[#0F5773] text-[#F5F7FA]'
                      : 'border-[#262B34] bg-[#090A0C] text-[#C9D1D9] hover:border-white/20'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 1: CREATE / TEMPLATES / BLANK */}
      {mode === 'create' && (
        <div className={cardCls}>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'Toate' },
              { id: 'custom', label: 'Liber / Baie' },
              { id: 'kitchen', label: 'Bucătărie' },
              { id: 'wardrobe', label: 'Dressing' },
              { id: 'living', label: 'Living' },
              { id: 'office', label: 'Birou' }
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTemplateCat(c.id)}
                className={`rounded-md border px-2 py-1 text-[10.5px] font-medium cursor-pointer transition ${
                  templateCat === c.id
                    ? 'border-[#355E43] bg-[#1F3627] text-[#F5F7FA]'
                    : 'border-[#262B34] bg-[#090A0C] text-[#8B949E] hover:text-[#F5F7FA]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-0.5">
            {filteredTemplates.map((tpl) => {
              const isSelected = draftTemplateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setDraftTemplateId(tpl.id);
                    handleInsertTemplate(tpl.id);
                  }}
                  className={`flex flex-col items-start rounded-lg border p-2 text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-[#17789E] bg-[#0F5773]/25 text-[#F5F7FA]'
                      : 'border-[#262B34] bg-[#090A0C] text-[#C9D1D9] hover:border-white/25 hover:bg-[#1C2027]'
                  }`}
                >
                  <span className="text-[11.5px] font-semibold leading-tight">
                    {isRo ? tpl.nameRo : tpl.nameEn}
                  </span>
                  <span className="mt-1 text-[10px] font-mono text-[#8B949E]">
                    {tpl.defaultW}×{tpl.defaultH}×{tpl.defaultD} mm
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 2: LIVE STRUCTURE & COMPARTMENT SPLITTER */}
      {mode === 'structure' && (
        <>
          {!activeAssembly ? (
            <div className={`${cardCls} text-xs text-[#8B949E]`}>
              {isRo
                ? 'Selectează un corp din scenă sau creează unul din tab-ul "Creează" pentru a-i edita dimensiunile și compartimentarea.'
                : 'Select a CAD assembly in the scene or create one first.'}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Overall Dimensions (mm) */}
              <div className={cardCls}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F5F7FA]">{activeAssembly.name}</span>
                  <span className="text-[10.5px] font-mono text-[#8B949E]">
                    {activeAssembly.widthMm}×{activeAssembly.heightMm}×{activeAssembly.depthMm} mm
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>Lățime (mm)</label>
                    <input
                      type="number"
                      min={150}
                      max={4000}
                      step={10}
                      value={activeAssembly.widthMm}
                      onChange={(e) =>
                        commitAssembly({ ...activeAssembly, widthMm: Number(e.target.value) || 600 }, true)
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Înălțime (mm)</label>
                    <input
                      type="number"
                      min={150}
                      max={3200}
                      step={10}
                      value={activeAssembly.heightMm}
                      onChange={(e) =>
                        commitAssembly({ ...activeAssembly, heightMm: Number(e.target.value) || 720 }, true)
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Adâncime (mm)</label>
                    <input
                      type="number"
                      min={120}
                      max={1500}
                      step={10}
                      value={activeAssembly.depthMm}
                      onChange={(e) =>
                        commitAssembly({ ...activeAssembly, depthMm: Number(e.target.value) || 560 }, true)
                      }
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Grosime PAL/MDF (mm)</label>
                    <select
                      value={activeAssembly.boardThicknessMm}
                      onChange={(e) =>
                        commitAssembly(
                          { ...activeAssembly, boardThicknessMm: Number(e.target.value) || 18 },
                          true
                        )
                      }
                      className={inputCls}
                    >
                      {[16, 18, 19, 22, 25, 38].map((t) => (
                        <option key={t} value={t}>
                          {t} mm
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Plintă (mm)</label>
                    <input
                      type="number"
                      min={0}
                      max={250}
                      step={10}
                      value={activeAssembly.plinthHeightMm}
                      onChange={(e) =>
                        commitAssembly(
                          { ...activeAssembly, plinthHeightMm: Number(e.target.value) || 0 },
                          true
                        )
                      }
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-[#C9D1D9]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={activeAssembly.hasTopPanel}
                      onCheckedChange={(v) =>
                        commitAssembly({ ...activeAssembly, hasTopPanel: v }, true)
                      }
                    />
                    <span>Capac</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={activeAssembly.hasBottomPanel}
                      onCheckedChange={(v) =>
                        commitAssembly({ ...activeAssembly, hasBottomPanel: v }, true)
                      }
                    />
                    <span>Fund</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={activeAssembly.hasBackPanel}
                      onCheckedChange={(v) =>
                        commitAssembly({ ...activeAssembly, hasBackPanel: v }, true)
                      }
                    />
                    <span>Spate HDF</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={activeAssembly.hasCountertop}
                      onCheckedChange={(v) =>
                        commitAssembly({ ...activeAssembly, hasCountertop: v }, true)
                      }
                    />
                    <span>Blat 38mm</span>
                  </label>
                </div>
              </div>

              {/* Recursive Compartment Splitter */}
              {activeAssembly.templateId !== 'blank' && (
                <div className={cardCls}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B949E]">
                    {isRo ? 'Compartimente & Fronturi' : 'Compartments & Fronts'}
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {leafNodes.map(({ node }, idx) => (
                      <div
                        key={node.id}
                        className="rounded-lg border border-[#262B34] bg-[#090A0C] p-2.5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11.5px] font-semibold text-[#F5F7FA]">
                            {node.label || `Zonă ${idx + 1}`}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                commitAssembly(
                                  {
                                    ...activeAssembly,
                                    rootNode: splitCompartmentNode(activeAssembly.rootNode, node.id, 'vertical', 2)
                                  },
                                  true
                                )
                              }
                              className="rounded border border-[#262B34] bg-[#14171C] px-1.5 py-0.5 text-[10px] text-[#C9D1D9] hover:bg-[#1C2027] cursor-pointer"
                              title="Împarte vertical în 2 coloane"
                            >
                              ⫼ 2 Col
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                commitAssembly(
                                  {
                                    ...activeAssembly,
                                    rootNode: splitCompartmentNode(activeAssembly.rootNode, node.id, 'horizontal', 2)
                                  },
                                  true
                                )
                              }
                              className="rounded border border-[#262B34] bg-[#14171C] px-1.5 py-0.5 text-[10px] text-[#C9D1D9] hover:bg-[#1C2027] cursor-pointer"
                              title="Împarte orizontal în 2 zone"
                            >
                              ☰ 2 Zone
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1">
                          {FILL_OPTIONS.map((fo) => (
                            <button
                              key={fo.id}
                              type="button"
                              onClick={() =>
                                commitAssembly(
                                  {
                                    ...activeAssembly,
                                    rootNode: updateCompartmentNode(activeAssembly.rootNode, node.id, {
                                      fill: fo.id
                                    })
                                  },
                                  true
                                )
                              }
                              className={`rounded border px-1 py-1 text-[10px] font-medium cursor-pointer transition ${
                                node.fill === fo.id
                                  ? 'border-[#17789E] bg-[#0F5773] text-[#F5F7FA]'
                                  : 'border-[#262B34] bg-[#14171C] text-[#8B949E] hover:text-[#F5F7FA]'
                              }`}
                            >
                              {fo.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#C9D1D9]">
                          <span>Polițe: {node.shelvesCount || 0}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                commitAssembly(
                                  {
                                    ...activeAssembly,
                                    rootNode: updateCompartmentNode(activeAssembly.rootNode, node.id, {
                                      shelvesCount: Math.max(0, (node.shelvesCount || 0) - 1)
                                    })
                                  },
                                  true
                                )
                              }
                              className="h-5 w-5 rounded border border-[#262B34] bg-[#14171C] text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                commitAssembly(
                                  {
                                    ...activeAssembly,
                                    rootNode: updateCompartmentNode(activeAssembly.rootNode, node.id, {
                                      shelvesCount: Math.min(10, (node.shelvesCount || 0) + 1)
                                    })
                                  },
                                  true
                                )
                              }
                              className="h-5 w-5 rounded border border-[#262B34] bg-[#14171C] text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          {node.fill === 'drawers' && (
                            <div className="flex items-center gap-1">
                              <span>Sertare: {node.drawersCount || 3}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  commitAssembly(
                                    {
                                      ...activeAssembly,
                                      rootNode: updateCompartmentNode(activeAssembly.rootNode, node.id, {
                                        drawersCount: Math.max(1, (node.drawersCount || 3) - 1)
                                      })
                                    },
                                    true
                                  )
                                }
                                className="h-5 w-5 rounded border border-[#262B34] bg-[#14171C] text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  commitAssembly(
                                    {
                                      ...activeAssembly,
                                      rootNode: updateCompartmentNode(activeAssembly.rootNode, node.id, {
                                        drawersCount: Math.min(8, (node.drawersCount || 3) + 1)
                                      })
                                    },
                                    true
                                  )
                                }
                                className="h-5 w-5 rounded border border-[#262B34] bg-[#14171C] text-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          )}

                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(node.hasRail)}
                              onChange={(e) =>
                                commitAssembly(
                                  {
                                    ...activeAssembly,
                                    rootNode: updateCompartmentNode(activeAssembly.rootNode, node.id, {
                                      hasRail: e.target.checked
                                    })
                                  },
                                  true
                                )
                              }
                            />
                            <span>Bară</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODE 3: FULL PART-LEVEL CAD EDITOR */}
      {mode === 'parts' && (
        <>
          {!activeAssembly ? (
            <div className={`${cardCls} text-xs text-[#8B949E]`}>
              {isRo
                ? 'Selectează sau creează un corp pentru a adăuga, șterge sau redimensiona piese individuale.'
                : 'Select or create an assembly to edit individual parts.'}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Add Part Presets */}
              <div className={cardCls}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B949E]">
                  {isRo ? 'Adaugă Piesă Nouă în Asamblare' : 'Add Part to Assembly'}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'horizontal', label: '+ Poliță' },
                      { id: 'vertical', label: '+ Montant' },
                      { id: 'front', label: '+ Ușă/Front' },
                      { id: 'back', label: '+ Spate' }
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => {
                        const res = addManualPart(activeAssembly, btn.id);
                        commitAssembly(res.assembly, false);
                        onSelectPartId?.(res.part.id);
                      }}
                      className="rounded-lg border border-[#355E43] bg-[#1F3627] py-1.5 text-[10.5px] font-semibold text-[#F5F7FA] hover:bg-[#2A4935] cursor-pointer transition"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parts List */}
              <div className={cardCls}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B949E]">
                  {isRo ? `Piese (${activeAssembly.parts.length})` : `Parts (${activeAssembly.parts.length})`}
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                  {activeAssembly.parts.map((p) => {
                    const isSel = activePart?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectPartId?.(p.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-[11px] cursor-pointer transition ${
                          isSel
                            ? 'border-[#17789E] bg-[#0F5773] text-[#F5F7FA]'
                            : 'border-[#262B34] bg-[#090A0C] text-[#C9D1D9] hover:bg-[#1C2027]'
                        }`}
                      >
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="ml-2 shrink-0 font-mono text-[10px] opacity-80">
                          {Math.round(p.dimensionsMm.length)}×{Math.round(p.dimensionsMm.width)}×{Math.round(p.dimensionsMm.thickness)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Part Inspector */}
              {activePart && (
                <div className={cardCls}>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={activePart.name}
                      onChange={(e) =>
                        commitAssembly(updateCadPart(activeAssembly, activePart.id, { name: e.target.value }))
                      }
                      className={`${inputCls} font-semibold`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const res = duplicateCadPart(activeAssembly, activePart.id);
                        commitAssembly(res.assembly);
                        if (res.part) onSelectPartId?.(res.part.id);
                      }}
                      className="shrink-0 rounded-lg border border-[#262B34] bg-[#1C2027] px-2 py-1.5 text-[10.5px] font-semibold text-[#C9D1D9] hover:text-[#F5F7FA] cursor-pointer"
                      title="Duplică piesa"
                    >
                      Duplică
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        commitAssembly(removeCadPart(activeAssembly, activePart.id));
                        onSelectPartId?.(null);
                      }}
                      className="shrink-0 rounded-lg border border-red-500/40 bg-red-500/15 px-2 py-1.5 text-[10.5px] font-semibold text-red-300 hover:bg-red-500/25 cursor-pointer"
                      title="Șterge piesa"
                    >
                      Șterge
                    </button>
                  </div>

                  {/* Dimensions (mm) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Lungime (mm)</label>
                      <input
                        type="number"
                        min={20}
                        step={5}
                        value={Math.round(activePart.dimensionsMm.length)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              dimensionsMm: {
                                ...activePart.dimensionsMm,
                                length: Math.max(20, Number(e.target.value) || 20)
                              }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Lățime (mm)</label>
                      <input
                        type="number"
                        min={20}
                        step={5}
                        value={Math.round(activePart.dimensionsMm.width)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              dimensionsMm: {
                                ...activePart.dimensionsMm,
                                width: Math.max(20, Number(e.target.value) || 20)
                              }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Grosime (mm)</label>
                      <input
                        type="number"
                        min={3}
                        max={80}
                        step={1}
                        value={Math.round(activePart.dimensionsMm.thickness)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              dimensionsMm: {
                                ...activePart.dimensionsMm,
                                thickness: Math.max(3, Number(e.target.value) || 18)
                              }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Local Position (mm) & Rotation (deg) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Pos X (mm)</label>
                      <input
                        type="number"
                        step={10}
                        value={Math.round(activePart.localPosMm.x)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              localPosMm: { ...activePart.localPosMm, x: Number(e.target.value) || 0 }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Pos Y (mm)</label>
                      <input
                        type="number"
                        step={10}
                        value={Math.round(activePart.localPosMm.y)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              localPosMm: { ...activePart.localPosMm, y: Number(e.target.value) || 0 }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Pos Z (mm)</label>
                      <input
                        type="number"
                        step={10}
                        value={Math.round(activePart.localPosMm.z)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              localPosMm: { ...activePart.localPosMm, z: Number(e.target.value) || 0 }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Rot X (°)</label>
                      <input
                        type="number"
                        step={15}
                        value={Math.round(activePart.localRotDeg.x)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              localRotDeg: { ...activePart.localRotDeg, x: Number(e.target.value) || 0 }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Rot Y (°)</label>
                      <input
                        type="number"
                        step={15}
                        value={Math.round(activePart.localRotDeg.y)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              localRotDeg: { ...activePart.localRotDeg, y: Number(e.target.value) || 0 }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Rot Z (°)</label>
                      <input
                        type="number"
                        step={15}
                        value={Math.round(activePart.localRotDeg.z)}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              localRotDeg: { ...activePart.localRotDeg, z: Number(e.target.value) || 0 }
                            })
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Shape & Grain */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Formă Piesă</label>
                      <select
                        value={activePart.shape}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              shape: e.target.value as PartShape
                            })
                          )
                        }
                        className={inputCls}
                      >
                        {SHAPE_OPTIONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Orientare Fibră</label>
                      <select
                        value={activePart.grain}
                        onChange={(e) =>
                          commitAssembly(
                            updateCadPart(activeAssembly, activePart.id, {
                              grain: e.target.value as CadPart['grain']
                            })
                          )
                        }
                        className={inputCls}
                      >
                        <option value="length">↕ Pe Lungime</option>
                        <option value="width">↔ Pe Lățime</option>
                        <option value="none">Fără Fibră</option>
                      </select>
                    </div>
                  </div>

                  {/* 4-Edge Banding */}
                  <div>
                    <label className={labelCls}>Cant ABS (4 Laturi)</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                        <div key={side}>
                          <span className="block text-[9.5px] uppercase text-[#8B949E] mb-0.5">
                            {side === 'top' ? 'Sus' : side === 'bottom' ? 'Jos' : side === 'left' ? 'Stg' : 'Dr'}
                          </span>
                          <select
                            value={activePart.edges[side]}
                            onChange={(e) =>
                              commitAssembly(
                                updateCadPart(activeAssembly, activePart.id, {
                                  edges: {
                                    ...activePart.edges,
                                    [side]: e.target.value as EdgeThickness
                                  }
                                })
                              )
                            }
                            className={`${inputCls} px-1 text-[10.5px]`}
                          >
                            {EDGE_OPTIONS.map((eo) => (
                              <option key={eo} value={eo}>
                                {eo === 'none' ? 'Fără' : eo}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODE 4: MULTI-UNIT KITCHEN / ROOM GENERATOR */}
      {mode === 'kitchen' && (
        <div className={cardCls}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B949E]">
            {isRo ? 'Generator Bucătărie Multi-Corp (Editabile Individual)' : 'Multi-Unit Kitchen Layout'}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: 'linear', label: 'Liniară' },
                { id: 'l_corner', label: 'Colț (L)' },
                { id: 'l_peninsula', label: 'L + Peninsulă' },
                { id: 'u_shape', label: 'Formă U' }
              ] as const
            ).map((lt) => (
              <button
                key={lt.id}
                type="button"
                onClick={() => setKitchenLayout(lt.id)}
                className={`rounded-lg border py-1.5 text-[11px] font-semibold cursor-pointer transition ${
                  kitchenLayout === lt.id
                    ? 'border-[#17789E] bg-[#0F5773] text-[#F5F7FA]'
                    : 'border-[#262B34] bg-[#090A0C] text-[#C9D1D9] hover:bg-[#1C2027]'
                }`}
              >
                {lt.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <div>
              <div className="flex justify-between text-[11px] text-[#C9D1D9] mb-1">
                <span>Perete Principal</span>
                <span className="font-mono">{mainWallCm} cm</span>
              </div>
              <Slider
                min={180}
                max={600}
                step={10}
                value={[mainWallCm]}
                onValueChange={([v]) => setMainWallCm(v)}
              />
            </div>

            {kitchenLayout !== 'linear' && (
              <div>
                <div className="flex justify-between text-[11px] text-[#C9D1D9] mb-1">
                  <span>Latură Retur</span>
                  <span className="font-mono">{returnWallCm} cm</span>
                </div>
                <Slider
                  min={120}
                  max={400}
                  step={10}
                  value={[returnWallCm]}
                  onValueChange={([v]) => setReturnWallCm(v)}
                />
              </div>
            )}

            {(kitchenLayout === 'l_peninsula' || kitchenLayout === 'u_shape') && (
              <div>
                <div className="flex justify-between text-[11px] text-[#C9D1D9] mb-1">
                  <span>Peninsulă</span>
                  <span className="font-mono">{peninsulaCm} cm</span>
                </div>
                <Slider
                  min={100}
                  max={300}
                  step={10}
                  value={[peninsulaCm]}
                  onValueChange={([v]) => setPeninsulaCm(v)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-[#C9D1D9]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Switch checked={includeFridgeCol} onCheckedChange={setIncludeFridgeCol} />
              <span>Coloană Frigider</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Switch checked={includeOvenCol} onCheckedChange={setIncludeOvenCol} />
              <span>Coloană Cuptor</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Switch checked={includeDishwasher} onCheckedChange={setIncludeDishwasher} />
              <span>Mașină Vase</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleGenerateKitchenLayout}
            className="w-full rounded-lg border border-[#17789E] bg-[#0F5773] py-2 text-xs font-bold text-[#F5F7FA] hover:bg-[#146E91] cursor-pointer transition"
          >
            {isRo ? 'Generează Corpuri Editabile în Scenă' : 'Generate Editable Units'}
          </button>
        </div>
      )}

      {/* Live BOM Footer */}
      {bom && (
        <div className="rounded-xl border border-[#355E43]/70 bg-[#1F3627]/35 p-2.5 flex items-center justify-between gap-2">
          <div className="text-[10.5px] text-[#C9D1D9] space-x-2">
            <span><strong className="text-[#F5F7FA]">{bom.totalParts}</strong> piese</span>
            <span>• PAL <strong className="text-[#F5F7FA]">{bom.carcassSqM}m²</strong></span>
            <span>• Front <strong className="text-[#F5F7FA]">{bom.facadeSqM}m²</strong></span>
            <span>• Cant <strong className="text-[#F5F7FA]">{bom.edgeMeters}ml</strong></span>
          </div>
          {onOpenTechnicalReport && (
            <button
              type="button"
              onClick={onOpenTechnicalReport}
              className="shrink-0 rounded-md border border-[#355E43] bg-[#1F3627] px-2 py-1 text-[10.5px] font-semibold text-[#F5F7FA] hover:bg-[#2A4935] cursor-pointer"
            >
              Raport CNC
            </button>
          )}
        </div>
      )}
    </div>
  );
}

