'use client';

import React, { useState } from 'react';
import { I18N } from '../i18n/translations';

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
    <div className="cad-tree-container">
      {/* Quick Add Custom Panel Action */}
      <div className="cad-toolbar-card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <strong style={{ fontSize: '0.8rem', color: '#f8fafc', display: 'block' }}>
            {isRo ? 'Corpuri & Piese CAD' : isRu ? 'Модули и детали CAD' : 'CAD Modules & Panels'}
          </strong>
          <small style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {importedModels.length} {isRo ? 'corpuri de mobilier în scenă' : 'cabinets in scene'}
          </small>
        </div>
        <button
          type="button"
          className="cad-btn-primary"
          onClick={() => setNewPanelModalOpen(true)}
          style={{ padding: '5px 10px', fontSize: '0.74rem', whiteSpace: 'nowrap' }}
        >
          <span>➕</span>
          <span>{isRo ? 'Panou Liber' : isRu ? 'Добавить деталь' : 'Add Panel'}</span>
        </button>
      </div>

      {/* Hierarchical Model Structural Tree */}
      <div className="cad-tree-card">
        <div className="tree-card-header">
          <span style={{ fontSize: '1rem' }}>🌲</span>
          <strong>{isRo ? 'Arbore Structură Model' : isRu ? 'Структурное дерево модели' : 'Model Structure Tree'}</strong>
        </div>

        <div className="tree-scroll-area">
          {/* Root Project Node */}
          <div className="tree-node root-node">
            <div className="tree-node-row">
              <span className="tree-expander" onClick={() => toggleNode('root')}>
                {expandedNodes.root ? '▼' : '▶'}
              </span>
              <span className="node-icon">🏠</span>
              <span className="node-label"><strong>{isRo ? 'Proiect Mobilier & Arhitectură' : isRu ? 'Проект интерьера и мебели' : 'Project Furniture & Architecture'}</strong></span>
            </div>

            {expandedNodes.root && (
              <div className="tree-children">
                {/* 1. Custom Imported & Parametric Furniture Modules Node */}
                <div className="tree-node">
                  <div className="tree-node-row">
                    <span className="tree-expander" onClick={() => toggleNode('furnitureModels')}>
                      {expandedNodes.furnitureModels ? '▼' : '▶'}
                    </span>
                    <span className="node-icon">📦</span>
                    <span className="node-label">
                      <strong>{isRo ? 'Corpuri de Mobilier Parametrice' : isRu ? 'Параметрические модули мебели' : 'Furniture Cabinets'}</strong>
                      <small style={{ color: '#94a3b8', marginLeft: '6px' }}>({importedModels.length})</small>
                    </span>
                  </div>

                  {expandedNodes.furnitureModels && (
                    <div className="tree-children">
                      {importedModels.length === 0 ? (
                        <div style={{ padding: '6px 12px', fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                          {isRo ? 'Niciun corp creat încă. Adaugă dulapuri, comode, dressinguri sau bucătării modulare.' : isRu ? 'Нет добавленных модулей. Создайте мебель во вкладке CAD.' : 'No custom cabinets yet. Create one in Furniture CAD tab.'}
                        </div>
                      ) : (
                        importedModels.map((model, idx) => {
                          const isHidden = hiddenPartIds.has(model.id);
                          const isSelected = selectedPartId === model.id;
                          const cuttingList = model.furnitureConfig?.panelCuttingList || model.panelCuttingList || [];

                          return (
                            <div key={model.id || idx} className={`tree-cabinet-block ${isSelected ? 'selected' : ''}`}>
                              <div
                                className="tree-cabinet-header"
                                onClick={() => onSelectPart && onSelectPart(model.id)}
                              >
                                <span className="leaf-icon">🛋️</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="cabinet-title">{model.name || `Corp #${idx + 1}`}</div>
                                  <div className="cabinet-meta">
                                    {model.furnitureConfig?.category || 'Corp Mobilier'} • {cuttingList.length} {isRo ? 'piese' : 'repere'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="tree-eye-btn"
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
                                    className="tree-eye-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteModel(model.id);
                                    }}
                                    title={isRo ? 'Șterge corp' : 'Delete'}
                                    style={{ color: '#f87171' }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {/* Sub-panels inside cabinet */}
                              {cuttingList.length > 0 && (
                                <div className="cabinet-subparts">
                                  {cuttingList.map((p: any, pIdx: number) => (
                                    <div key={pIdx} className="subpart-row">
                                      <span style={{ color: '#38bdf8' }}>▫</span>
                                      <span className="subpart-name">{p.partName || p.name}</span>
                                      <span className="subpart-dims">{p.lengthMm || p.length}×{p.widthMm || p.width} mm</span>
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
                <div className="tree-node">
                  <div className="tree-node-row">
                    <span className="tree-expander" onClick={() => toggleNode('appliancesNode')}>
                      {expandedNodes.appliancesNode ? '▼' : '▶'}
                    </span>
                    <span className="node-icon">🍳</span>
                    <span className="node-label">
                      <strong>{isRo ? 'Electrocasnice & Dotări Tehnice' : isRu ? 'Встраиваемая техника' : 'Built-in Appliances'}</strong>
                      <small style={{ color: '#94a3b8', marginLeft: '6px' }}>({appliances.length})</small>
                    </span>
                  </div>

                  {expandedNodes.appliancesNode && (
                    <div className="tree-children">
                      {appliances.length === 0 ? (
                        <div style={{ padding: '6px 12px', fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                          {isRo ? 'Niciun aparat electrocasnic adăugat încă. Deschide secțiunea "Tehnică & Dotări".' : isRu ? 'Техника не добавлена.' : 'No appliances added yet.'}
                        </div>
                      ) : (
                        appliances.map((app, idx) => {
                          const isHidden = hiddenPartIds.has(app.id);
                          const isSelected = selectedPartId === app.id;
                          return (
                            <div key={app.id || idx} className={`tree-cabinet-block ${isSelected ? 'selected' : ''}`}>
                              <div
                                className="tree-cabinet-header"
                                onClick={() => onSelectPart && onSelectPart(app.id)}
                              >
                                <span className="leaf-icon">⚡</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="cabinet-title">{app.name}</div>
                                  <div className="cabinet-meta">
                                    {app.dimensions?.width}×{app.dimensions?.height} mm • {app.powerKw > 0 ? `${app.powerKw} kW` : 'Plumbing'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="tree-eye-btn"
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
                                    className="tree-eye-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteModel(app.id);
                                    }}
                                    title={isRo ? 'Șterge aparat' : 'Delete'}
                                    style={{ color: '#f87171' }}
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
      {newPanelModalOpen && (
        <div className="report-modal-backdrop" onClick={() => setNewPanelModalOpen(false)}>
          <div className="report-modal-window" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="report-header-bar">
              <div className="report-brand">
                <span className="report-icon">📐</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>{isRo ? 'Adăugare Panou CAD Liber' : isRu ? 'Создать произвольную деталь' : 'Add Custom Panel'}</h3>
                  <small style={{ color: '#94a3b8' }}>{isRo ? 'Specifică dimensiunile milimetrice și orientarea' : isRu ? 'Параметры детали в мм' : 'Specify mm dimensions'}</small>
                </div>
              </div>
              <button className="sheet-close-btn" onClick={() => setNewPanelModalOpen(false)}>✕</button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="param-label">{isRo ? 'Denumire Piesă:' : isRu ? 'Название детали:' : 'Part Name:'}</label>
                <input
                  type="text"
                  className="param-input"
                  value={newPanelConfig.name}
                  onChange={(e) => setNewPanelConfig({ ...newPanelConfig, name: e.target.value })}
                />
              </div>

              <div>
                <label className="param-label">{isRo ? 'Orientare Spațială:' : isRu ? 'Ориентация в пространстве:' : 'Orientation:'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'horizontal', label: isRo ? 'Orizontal' : isRu ? 'Горизонт' : 'Horizontal' },
                    { id: 'vertical', label: isRo ? 'Vertical' : isRu ? 'Вертикаль' : 'Vertical' },
                    { id: 'frontal', label: isRo ? 'Frontal' : isRu ? 'Фронтально' : 'Frontal' }
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`btn-pill ${newPanelConfig.orientation === o.id ? 'active' : ''}`}
                      onClick={() => setNewPanelConfig({ ...newPanelConfig, orientation: o.id })}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="param-label">{isRo ? 'Lungime (mm):' : isRu ? 'Длина (мм):' : 'Length (mm):'}</label>
                  <input
                    type="number"
                    className="param-input"
                    value={newPanelConfig.lengthMm}
                    onChange={(e) => setNewPanelConfig({ ...newPanelConfig, lengthMm: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="param-label">{isRo ? 'Lățime (mm):' : isRu ? 'Ширина (мм):' : 'Width (mm):'}</label>
                  <input
                    type="number"
                    className="param-input"
                    value={newPanelConfig.widthMm}
                    onChange={(e) => setNewPanelConfig({ ...newPanelConfig, widthMm: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="param-label">{isRo ? 'Grosime:' : isRu ? 'Толщина:' : 'Thickness:'}</label>
                  <select
                    className="param-input"
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
                  <label className="param-label">{isRo ? 'Finisaj Cant:' : isRu ? 'Кромка:' : 'Edge Banding:'}</label>
                  <select
                    className="param-input"
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
                className="btn-primary"
                onClick={handleCreatePanel}
                style={{ marginTop: '10px' }}
              >
                <span>➕</span>
                <span>{isRo ? 'Generează Panou în Scenă' : isRu ? 'Создать деталь' : 'Generate Panel in Scene'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
