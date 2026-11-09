'use client';

import React, { useState, useRef } from 'react';
import { I18N } from '../i18n/translations';

export interface TopBarProps {
  lang: string;
  onChangeLang: (lang: string) => void;
  dimsEnabled: boolean;
  onToggleDims: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  is2DPlanMode?: boolean;
  onToggle2DPlanMode?: () => void;
  onNewProject?: () => void;
  onSaveProject?: () => void;
  onLoadProject?: (file: File) => void;
  onOpenTechnicalReport?: () => void;
  magneticSnapEnabled?: boolean;
  onToggleMagneticSnap?: () => void;
  onCaptureScreenshot?: () => void;
  onExportSceneGlb?: () => void;
  onExportSceneB3D?: () => void;
  onExportSceneObj?: () => void;
  currentUser?: { uid: string; email: string; displayName: string; photoURL?: string | null } | null;
  activeCloudProjectName?: string | null;
  onOpenUserProfile?: () => void;
  onOpenPhotorealRender?: () => void;
  onOpenShareModal?: () => void;
  isSharedReadOnly?: boolean;
  sharedMeta?: { projectName?: string; authorName?: string } | null;
}

export default function TopBar({
  lang,
  onChangeLang,
  dimsEnabled,
  onToggleDims,
  panelOpen,
  onTogglePanel,
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
  is2DPlanMode = false,
  onToggle2DPlanMode,
  onNewProject,
  onSaveProject,
  onLoadProject,
  onOpenTechnicalReport,
  magneticSnapEnabled = true,
  onToggleMagneticSnap,
  onCaptureScreenshot,
  onExportSceneGlb,
  onExportSceneB3D,
  onExportSceneObj,
  currentUser,
  activeCloudProjectName,
  onOpenUserProfile,
  onOpenPhotorealRender,
  onOpenShareModal,
  isSharedReadOnly = false,
  sharedMeta
}: TopBarProps) {
  const dict = I18N[lang] || I18N.ro;
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadProject) {
      onLoadProject(file);
    }
    e.target.value = '';
    setProjectMenuOpen(false);
  };

  return (
    <div id="top-bar">
      <div className="brand-card">
        <div className="brand-icon">3D</div>
        <div className="brand-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>{dict.title}</h1>
            {isSharedReadOnly && (
              <span
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(6, 182, 212, 0.25))',
                  border: '1px solid rgba(34, 197, 94, 0.55)',
                  color: '#4ade80',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}
              >
                👁️ {isRo ? 'Prezentare Client' : isRu ? 'Просмотр Клиента' : 'Client View'}
              </span>
            )}
          </div>
          <p>{sharedMeta?.projectName ? `${sharedMeta.projectName} • ${sharedMeta.authorName || 'Design 3D'}` : dict.subtitle}</p>
        </div>
      </div>

      <div className="top-actions">
        {/* Project Manager Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`action-btn ${projectMenuOpen ? 'active' : ''}`}
            onClick={() => setProjectMenuOpen((v) => !v)}
            title="Meniu Proiect & Export"
          >
            <span>📂</span>
            <span className="btn-label-desktop">{isRo ? 'Proiect' : isRu ? 'Проект' : 'Project'} ▾</span>
          </button>

          {projectMenuOpen && (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 40,
                  cursor: 'default'
                }}
                onClick={() => setProjectMenuOpen(false)}
              />

              <div className="project-dropdown-menu" style={{ zIndex: 50 }}>
                {onOpenUserProfile && (
                  <>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setProjectMenuOpen(false);
                        onOpenUserProfile();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(99, 102, 241, 0.14))',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        marginBottom: '4px'
                      }}
                    >
                      <span>☁️</span>
                      <div>
                        <strong style={{ color: '#7dd3fc' }}>
                          {currentUser
                            ? isRo
                              ? `Proiecte Cloud (${currentUser.displayName})`
                              : `Cloud Projects (${currentUser.displayName})`
                            : isRo
                            ? 'Contul Meu & Proiecte Cloud (Multi-Device)'
                            : isRu
                            ? 'Мой профиль и облачные проекты'
                            : 'My Account & Cloud Projects'}
                        </strong>
                        <small>
                          {isRo
                            ? 'Salvează și deschide proiectele tale de pe PC, tabletă sau telefon'
                            : isRu
                            ? 'Синхронизация проектов между ПК и смартфоном'
                            : 'Sync and access your 3D projects on any device'}
                        </small>
                      </div>
                    </button>
                    <div className="dropdown-divider" />
                  </>
                )}

                {onOpenShareModal && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setProjectMenuOpen(false);
                      onOpenShareModal();
                    }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(6, 182, 212, 0.16))',
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      marginBottom: '4px'
                    }}
                  >
                    <span>🔗</span>
                    <div>
                      <strong style={{ color: '#4ade80' }}>
                        {isRo
                          ? 'Partajează cu Clientul (Link 3D / WhatsApp)'
                          : isRu
                          ? 'Поделиться 3D с клиентом (WhatsApp)'
                          : 'Share 3D with Client (Public Link / WhatsApp)'}
                      </strong>
                      <small>
                        {isRo
                          ? 'Generează link public pentru telefon, tabletă sau PC fără cont'
                          : isRu
                          ? 'Публичная 3D ссылка для смартфона и ПК'
                          : 'Public read-only link for client on any device'}
                      </small>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onNewProject) onNewProject();
                  }}
                >
                  <span>🆕</span>
                  <div>
                    <strong>{isRo ? 'Proiect Nou (Scenă Curată CAD)' : isRu ? 'Новый проект (Чистая сцена)' : 'New Project (Clean CAD Space)'}</strong>
                    <small>{isRo ? 'Spațiu de lucru liber cu grilă milimetrică CAD' : isRu ? 'Чистое рабочее пространство с сеткой CAD' : 'Clean workspace with millimeter CAD grid'}</small>
                  </div>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onSaveProject) onSaveProject();
                  }}
                >
                  <span>💾</span>
                  <div>
                    <strong>{isRo ? 'Salvează Proiect (.json / .cadproj)' : isRu ? 'Сохранить проект (.json / .cadproj)' : 'Save Project (.json / .cadproj)'}</strong>
                    <small>{isRo ? 'Fișier standard cu toate corpurile, cotele și finisajele' : isRu ? 'Файл проекта со всеми деталями и материалами' : 'Standard project file with models & materials'}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <span>📥</span>
                  <div>
                    <strong>{isRo ? 'Încarcă Proiect sau Model (.glb, .b3d, .obj, .json)' : isRu ? 'Открыть проект или 3D модель (.glb, .b3d, .obj, .json)' : 'Open Project or 3D Model (.glb, .b3d, .obj, .json)'}</strong>
                    <small>{isRo ? 'Recunoaște automat modele 3D, proiecte și fișiere de fabricație' : isRu ? 'Автоматическое распознавание 3D моделей и проектов' : 'Auto-detects 3D models, projects & CAD assemblies'}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onExportSceneGlb) onExportSceneGlb();
                  }}
                >
                  <span>📦</span>
                  <div>
                    <strong>{isRo ? 'Exportă Scenă 3D (.glb)' : isRu ? 'Экспорт 3D сцены (.glb)' : 'Export 3D Scene (.glb)'}</strong>
                    <small>{isRo ? 'Model 3D binar complet pentru randare, Blender și 3ds Max' : isRu ? 'Бинарная 3D модель для Blender / 3ds Max / AR' : 'Binary 3D model for rendering & visualization'}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onExportSceneB3D) onExportSceneB3D();
                  }}
                >
                  <span>🧱</span>
                  <div>
                    <strong>{isRo ? 'Exportă Model Tehnic CAD (.b3d)' : isRu ? 'Экспорт модели CAD (.b3d)' : 'Export Technical CAD Model (.b3d)'}</strong>
                    <small>{isRo ? 'Tabel panouri (mm), canturi ABS, feronerie și cote atelier' : isRu ? 'Панели (мм), кромки ABS, фурнитура и спецификация' : 'Panels (mm), ABS edge bands & hardware'}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onExportSceneObj) onExportSceneObj();
                  }}
                >
                  <span>📐</span>
                  <div>
                    <strong>{isRo ? 'Exportă Geometrie CAD (.obj + .mtl)' : isRu ? 'Экспорт геометрии CAD (.obj + .mtl)' : 'Export CAD Geometry (.obj + .mtl)'}</strong>
                    <small>{isRo ? 'Format geometric universal pentru softuri CAD și CNC' : isRu ? 'Универсальный формат геометрии для CAD и ЧПУ' : 'Universal geometric format for CAD & CNC'}</small>
                  </div>
                </button>

                <div className="dropdown-divider" />

                {onOpenPhotorealRender && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setProjectMenuOpen(false);
                      onOpenPhotorealRender();
                    }}
                  >
                    <span>📸</span>
                    <div>
                      <strong style={{ color: '#fde68a' }}>
                        {isRo
                          ? 'Studio Randare 3D Fotorealistă (Poză Realistă)'
                          : isRu
                          ? 'Фотореалистичный 3D Рендер (Фото)'
                          : 'Photorealistic 3D Render Studio'}
                      </strong>
                      <small>
                        {isRo
                          ? 'Umbre moi Ray-Shadow, parchet/marmură, iluminare 5500K/3700K și export 4K'
                          : 'Soft shadows, realistic floor & walls, color grading & 4K export'}
                      </small>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onOpenTechnicalReport) onOpenTechnicalReport();
                  }}
                >
                  <span>📄</span>
                  <div>
                    <strong>{isRo ? 'Fișă Tehnică & Raport Fabricație' : isRu ? 'Техническая карта и спецификация' : 'Technical Spec & Cutting List'}</strong>
                    <small>{isRo ? 'Tabel debitare, suprafețe m² și consum PAL' : isRu ? 'Карта раскроя, площадь м² и смета' : 'Cutting list, board area & hardware'}</small>
                  </div>
                </button>
              </div>
            </>
          )}

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json,.cadproj,.glb,.gltf,.b3d,.obj,.3design"
            onChange={handleFileChange}
          />
        </div>

        {/* User Profile & Multi-Device Cloud Projects Button */}
        {onOpenUserProfile && (
          <button
            type="button"
            className="action-btn"
            onClick={onOpenUserProfile}
            title={
              currentUser
                ? `${currentUser.displayName} (${currentUser.email})${activeCloudProjectName ? ` — Proiect: ${activeCloudProjectName}` : ''}`
                : isRo
                ? 'Autentificare & Proiecte Cloud (Email / Gmail)'
                : isRu
                ? 'Профиль и облачные проекты'
                : 'Sign In & Cloud Projects'
            }
            style={
              currentUser
                ? {
                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.22), rgba(99, 102, 241, 0.22))',
                    borderColor: 'rgba(56, 189, 248, 0.55)'
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  }
            }
          >
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              {currentUser ? '☁️' : '👤'}
              {currentUser && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-2px',
                    boxShadow: '0 0 6px #22c55e'
                  }}
                />
              )}
            </span>
            <span className="btn-label-desktop">
              {currentUser
                ? currentUser.displayName.length > 14
                  ? currentUser.displayName.slice(0, 14) + '…'
                  : currentUser.displayName
                : isRo
                ? 'Contul Meu'
                : isRu
                ? 'Профиль'
                : 'Profile'}
            </span>
          </button>
        )}

        {/* 2D Plan View / 3D CAD Perspective Switcher */}
        {onToggle2DPlanMode && (
          <button
            type="button"
            className={`action-btn hide-on-mobile ${is2DPlanMode ? 'active' : ''}`}
            onClick={onToggle2DPlanMode}
            title={is2DPlanMode ? 'Comută la Perspectivă 3D CAD' : 'Comută la Schiță 2D Plan Arhitectural'}
            style={is2DPlanMode ? { background: 'rgba(56, 189, 248, 0.25)', borderColor: '#38bdf8' } : {}}
          >
            <span>{is2DPlanMode ? '🏛️' : '📐'}</span>
            <span className="btn-label-desktop">
              {is2DPlanMode
                ? (isRo ? 'Vedere 3D' : isRu ? 'Вид 3D' : '3D View')
                : (isRo ? 'Schiță 2D' : isRu ? 'План 2D' : '2D Plan')}
            </span>
          </button>
        )}

        {/* Magnetic Snapping Toggle */}
        <button
          type="button"
          className={`action-btn hide-on-mobile ${magneticSnapEnabled ? 'active' : ''}`}
          onClick={onToggleMagneticSnap}
          title={isRo ? 'Lipire Magnetică Automată (Snapping 3D)' : isRu ? 'Магнитное прилипание деталей' : 'Magnetic 3D Snapping'}
        >
          <span>🧲</span>
          <span className="btn-label-desktop">{magneticSnapEnabled ? 'Snap: ON' : 'Snap: OFF'}</span>
        </button>

        {/* Technical Report Direct Button */}
        <button
          type="button"
          className="action-btn"
          onClick={onOpenTechnicalReport}
          title={isRo ? 'Fișă Tehnică & Raport Debitări' : isRu ? 'Техническая спецификация' : 'Technical Report'}
          style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.15))', borderColor: 'rgba(56, 189, 248, 0.4)' }}
        >
          <span>📄</span>
          <span className="btn-label-desktop">{isRo ? 'Fișă Tehnică' : isRu ? 'Спецификация' : 'Cutting List'}</span>
        </button>

        {/* Photorealistic 3D Render Studio Button */}
        <button
          type="button"
          className="action-btn"
          onClick={onOpenPhotorealRender || onCaptureScreenshot}
          title={
            isRo
              ? 'Studio Randare 3D Fotorealistă (Poză Realistă HD / 4K)'
              : isRu
              ? 'Фотореалистичный 3D Рендер (HD / 4K)'
              : 'Photorealistic 3D Render Studio'
          }
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(236, 72, 153, 0.18))',
            borderColor: 'rgba(245, 158, 11, 0.5)'
          }}
        >
          <span>📸</span>
          <span className="btn-label-desktop">
            {isRo ? 'Render Foto 3D' : isRu ? '3D Рендер' : '3D Render'}
          </span>
        </button>

        {/* Client 3D Presentation & WhatsApp Quick Share */}
        {onOpenShareModal && (
          <button
            type="button"
            className="action-btn"
            onClick={onOpenShareModal}
            title={
              isRo
                ? 'Partajează Prezentarea 3D cu Clientul (Link Public / WhatsApp)'
                : isRu
                ? 'Поделиться 3D с клиентом (Ссылка / WhatsApp)'
                : 'Share 3D Presentation with Client (Public Link / WhatsApp)'
            }
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(6, 182, 212, 0.22))',
              borderColor: 'rgba(34, 197, 94, 0.55)'
            }}
          >
            <span>🔗</span>
            <span className="btn-label-desktop">
              {isRo ? 'Partajează' : isRu ? 'Поделиться' : 'Share 3D'}
            </span>
          </button>
        )}

        <button
          type="button"
          id="btn-top-undo"
          className="action-btn hide-on-mobile"
          disabled={!canUndo}
          onClick={onUndo}
          title={dict.undo}
        >
          <span>↩️</span>
          <span className="btn-label-desktop">{dict.undoBtn}</span>
        </button>

        <button
          type="button"
          id="btn-top-redo"
          className="action-btn hide-on-mobile"
          disabled={!canRedo}
          onClick={onRedo}
          title={dict.redo}
        >
          <span>↪️</span>
          <span className="btn-label-desktop">{dict.redoBtn}</span>
        </button>

        <button
          type="button"
          id="btn-top-dims"
          className={`action-btn ${dimsEnabled ? 'active' : ''}`}
          onClick={onToggleDims}
          title="Toggle Dimensions in cm"
        >
          <span>📏</span>
          <span className="btn-label-desktop">{dict.showDims}</span>
        </button>

        <div className="lang-switch">
          {['en', 'ru', 'ro'].map((l) => (
            <button
              type="button"
              key={l}
              className={`lang-btn ${lang === l ? 'active' : ''}`}
              onClick={() => onChangeLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          type="button"
          id="btn-toggle-panel"
          className={`action-btn ${panelOpen ? 'active' : ''}`}
          onClick={onTogglePanel}
        >
          <span>⚙️</span>
          <span className="btn-label-panel">{dict.controlsToggle}</span>
        </button>
      </div>
    </div>
  );
}
