'use client';

import React, { useRef } from 'react';
import FolderOpen from 'lucide-react/icons/folder-open';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Magnet from 'lucide-react/icons/magnet';
import Camera from 'lucide-react/icons/camera';
import Share2 from 'lucide-react/icons/share-2';
import Undo2 from 'lucide-react/icons/undo-2';
import Redo2 from 'lucide-react/icons/redo-2';
import Ruler from 'lucide-react/icons/ruler';
import Crosshair from 'lucide-react/icons/crosshair';
import SlidersHorizontal from 'lucide-react/icons/sliders-horizontal';
import Cloud from 'lucide-react/icons/cloud';
import FilePlus from 'lucide-react/icons/file-plus';
import Save from 'lucide-react/icons/save';
import Upload from 'lucide-react/icons/upload';
import Box from 'lucide-react/icons/box';
import Layers from 'lucide-react/icons/layers';
import Map from 'lucide-react/icons/map';
import FileSpreadsheet from 'lucide-react/icons/file-spreadsheet';
import Eye from 'lucide-react/icons/eye';
import Sparkles from 'lucide-react/icons/sparkles';
import { I18N } from '../i18n/translations';
import { cn } from '../utils/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';

export interface TopBarProps {
  lang: string;
  onChangeLang: (lang: string) => void;
  dimsEnabled: boolean;
  onToggleDims: () => void;
  isTapeActive?: boolean;
  onToggleTapeMeasure?: () => void;
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
  isTapeActive = false,
  onToggleTapeMeasure,
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
  onOpenUserProfile,
  onOpenPhotorealRender,
  onOpenShareModal,
  isSharedReadOnly = false,
  sharedMeta,
}: TopBarProps) {
  const dict = I18N[lang] || I18N.ro;
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadProject) {
      onLoadProject(file);
    }
    e.target.value = '';
  };

  return (
    <header
      id="top-bar"
      className="pointer-events-none fixed left-3 right-3 top-3 z-20 flex items-center justify-between gap-2"
    >
      {/* Brand Card */}
      <div className="pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/12 bg-[#14171d]/90 px-3.5 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#d4a359] to-[#9b6b29] text-sm font-extrabold text-zinc-950 shadow-[0_4px_12px_rgba(212,163,89,0.25)]">
          3D
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[0.92rem] font-bold tracking-tight text-zinc-100">
              {dict.title}
            </h1>
            {isSharedReadOnly && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <Eye className="h-3 w-3" />
                {isRo ? 'Prezentare Client' : isRu ? 'Просмотр Клиента' : 'Client View'}
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-zinc-400">
            {sharedMeta?.projectName
              ? `${sharedMeta.projectName} • ${sharedMeta.authorName || 'Design 3D'}`
              : dict.subtitle}
          </p>
        </div>
      </div>

      {/* Top Actions */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
        {/* Project Dropdown Menu (Radix UI) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border border-white/12 bg-[#14171d]/90 px-3 text-xs font-semibold text-zinc-100 shadow-lg backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 data-[state=open]:border-amber-400/50 data-[state=open]:bg-amber-500/15 data-[state=open]:text-amber-300"
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden lg:inline">
                {isRo ? 'Proiect' : isRu ? 'Проект' : 'Project'}
              </span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            {onOpenUserProfile && (
              <>
                <DropdownMenuItem
                  onClick={onOpenUserProfile}
                  className="border border-sky-500/30 bg-gradient-to-r from-sky-500/15 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25"
                >
                  <Cloud className="h-4 w-4 shrink-0 text-sky-400" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sky-300">
                      {currentUser
                        ? isRo
                          ? `Proiecte Cloud (${currentUser.displayName})`
                          : `Cloud Projects (${currentUser.displayName})`
                        : isRo
                        ? 'Contul Meu & Proiecte Cloud'
                        : isRu
                        ? 'Мой профиль и облачные проекты'
                        : 'My Account & Cloud Projects'}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {isRo
                        ? 'Salvează și deschide proiectele de pe orice dispozitiv'
                        : isRu
                        ? 'Синхронизация проектов между ПК и смартфоном'
                        : 'Sync and access your 3D projects on any device'}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {onOpenShareModal && (
              <DropdownMenuItem
                onClick={onOpenShareModal}
                className="mb-1 border border-emerald-500/35 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 hover:from-emerald-500/25 hover:to-cyan-500/25"
              >
                <Share2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="font-bold text-emerald-300">
                    {isRo
                      ? 'Partajează cu Clientul (Link 3D)'
                      : isRu
                      ? 'Поделиться 3D с клиентом'
                      : 'Share 3D with Client'}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {isRo
                      ? 'Link public pentru telefon, tabletă sau PC fără cont'
                      : isRu
                      ? 'Публичная 3D ссылка для смартфона и ПК'
                      : 'Public read-only link for client'}
                  </span>
                </div>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => onNewProject?.()}>
              <FilePlus className="h-4 w-4 shrink-0 text-zinc-300" />
              <div className="flex flex-col">
                <span className="font-semibold">
                  {isRo
                    ? 'Proiect Nou (Scenă Curată CAD)'
                    : isRu
                    ? 'Новый проект (Чистая сцена)'
                    : 'New Project (Clean CAD Space)'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {isRo
                    ? 'Spațiu de lucru liber cu grilă milimetrică CAD'
                    : 'Clean workspace with millimeter CAD grid'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => onSaveProject?.()}>
              <Save className="h-4 w-4 shrink-0 text-amber-400" />
              <div className="flex flex-col">
                <span className="font-semibold">
                  {isRo
                    ? 'Salvează Proiect (.json / .cadproj)'
                    : isRu
                    ? 'Сохранить проект (.json / .cadproj)'
                    : 'Save Project (.json / .cadproj)'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {isRo
                    ? 'Fișier standard cu corpuri, cote și finisaje'
                    : 'Standard project file with models & materials'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 shrink-0 text-sky-400" />
              <div className="flex flex-col">
                <span className="font-semibold">
                  {isRo
                    ? 'Încarcă Proiect sau Model (.glb, .b3d, .obj)'
                    : isRu
                    ? 'Открыть проект или модель (.glb, .b3d, .obj)'
                    : 'Open Project or 3D Model (.glb, .b3d, .obj)'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {isRo
                    ? 'Recunoaște automat modele 3D și proiecte'
                    : 'Auto-detects 3D models & projects'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onExportSceneGlb?.()}>
              <Box className="h-4 w-4 shrink-0 text-indigo-400" />
              <div className="flex flex-col">
                <span className="font-semibold">
                  {isRo ? 'Exportă Scenă 3D (.glb)' : isRu ? 'Экспорт 3D сцены (.glb)' : 'Export 3D Scene (.glb)'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {isRo ? 'Model 3D complet pentru Blender / 3ds Max' : 'Binary 3D model for rendering'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onExportSceneB3D?.()}>
              <Layers className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="flex flex-col">
                <span className="font-semibold">
                  {isRo ? 'Exportă Model Tehnic CAD (.b3d)' : isRu ? 'Экспорт CAD (.b3d)' : 'Export Technical CAD (.b3d)'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {isRo ? 'Panouri (mm), canturi ABS și feronerie' : 'Panels (mm), ABS edge bands & hardware'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onExportSceneObj?.()}>
              <Box className="h-4 w-4 shrink-0 text-zinc-400" />
              <div className="flex flex-col">
                <span className="font-semibold">
                  {isRo ? 'Exportă Geometrie CAD (.obj + .mtl)' : isRu ? 'Экспорт геометрии (.obj + .mtl)' : 'Export CAD Geometry (.obj + .mtl)'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {isRo ? 'Format geometric universal CAD & CNC' : 'Universal geometric format for CAD & CNC'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {onToggle2DPlanMode && (
              <DropdownMenuItem onClick={onToggle2DPlanMode}>
                <Map className="h-4 w-4 shrink-0 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {is2DPlanMode
                      ? isRo
                        ? 'Comută la Vedere 3D CAD'
                        : isRu
                        ? 'Перейти в 3D вид'
                        : 'Switch to 3D View'
                      : isRo
                      ? 'Schiță 2D Plan Arhitectural'
                      : isRu
                      ? '2D Архитектурный план'
                      : '2D Floor Plan'}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {isRo ? 'Vedere tehnică de sus cu pereți și cote' : 'Top-down layout of room & furniture'}
                  </span>
                </div>
              </DropdownMenuItem>
            )}

            {onOpenPhotorealRender && (
              <DropdownMenuItem onClick={onOpenPhotorealRender}>
                <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
                <div className="flex flex-col">
                  <span className="font-bold text-amber-200">
                    {isRo
                      ? 'Studio Randare 3D Fotorealistă'
                      : isRu
                      ? 'Фотореалистичный 3D Рендер'
                      : 'Photorealistic 3D Render Studio'}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {isRo ? 'Umbre moi, iluminare 5500K și export 4K' : 'Soft shadows, lighting & 4K export'}
                  </span>
                </div>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => onOpenTechnicalReport?.()}>
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-amber-400" />
              <div className="flex flex-col">
                <span className="font-semibold">
                  {isRo
                    ? 'Fișă Tehnică & Raport Fabricație'
                    : isRu
                    ? 'Техническая карта'
                    : 'Technical Spec & Cutting List'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {isRo ? 'Tabel debitare, suprafețe m² și consum PAL' : 'Cutting list & board area'}
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json,.cadproj,.glb,.gltf,.b3d,.obj,.3design"
          onChange={handleFileChange}
        />

        {/* Magnetic Snapping Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleMagneticSnap}
              className={cn(
                'hidden h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold shadow-lg backdrop-blur-xl transition md:inline-flex',
                magneticSnapEnabled
                  ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                  : 'border-white/12 bg-[#14171d]/90 text-zinc-300 hover:bg-white/10'
              )}
            >
              <Magnet className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{magneticSnapEnabled ? 'Snap: ON' : 'Snap: OFF'}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isRo ? 'Lipire Magnetică Automată (Snapping 3D)' : isRu ? 'Магнитное прилипание' : 'Magnetic 3D Snapping'}
          </TooltipContent>
        </Tooltip>

        {/* Photorealistic 3D Render */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenPhotorealRender || onCaptureScreenshot}
              className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/45 bg-gradient-to-r from-amber-500/20 to-pink-500/15 px-3 text-xs font-semibold text-amber-200 shadow-lg backdrop-blur-xl transition hover:from-amber-500/30 hover:to-pink-500/25"
            >
              <Camera className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden lg:inline">
                {isRo ? 'Render Foto 3D' : isRu ? '3D Рендер' : '3D Render'}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isRo ? 'Studio Randare 3D Fotorealistă (HD / 4K)' : 'Photorealistic 3D Render Studio'}
          </TooltipContent>
        </Tooltip>

        {/* Client Share */}
        {onOpenShareModal && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpenShareModal}
                className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 px-3 text-xs font-semibold text-emerald-200 shadow-lg backdrop-blur-xl transition hover:from-emerald-500/30 hover:to-cyan-500/30"
              >
                <Share2 className="h-3.5 w-3.5 text-emerald-300" />
                <span className="hidden lg:inline">
                  {isRo ? 'Partajează' : isRu ? 'Поделиться' : 'Share 3D'}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isRo ? 'Partajează Prezentarea 3D cu Clientul (Link Public)' : 'Share 3D Presentation with Client'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              id="btn-top-undo"
              disabled={!canUndo}
              onClick={onUndo}
              className="hidden h-8.5 cursor-pointer items-center gap-1 rounded-xl border border-white/12 bg-[#14171d]/90 px-2.5 text-xs font-semibold text-zinc-200 shadow-lg backdrop-blur-xl transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{dict.undoBtn}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{dict.undo}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              id="btn-top-redo"
              disabled={!canRedo}
              onClick={onRedo}
              className="hidden h-8.5 cursor-pointer items-center gap-1 rounded-xl border border-white/12 bg-[#14171d]/90 px-2.5 text-xs font-semibold text-zinc-200 shadow-lg backdrop-blur-xl transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
            >
              <Redo2 className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{dict.redoBtn}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{dict.redo}</TooltipContent>
        </Tooltip>

        {/* 3D Dimensions Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              id="btn-top-dims"
              onClick={onToggleDims}
              className={cn(
                'inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold shadow-lg backdrop-blur-xl transition',
                dimsEnabled && !isTapeActive
                  ? 'border-amber-400/55 bg-amber-500/20 text-amber-200'
                  : 'border-white/12 bg-[#14171d]/90 text-zinc-200 hover:bg-white/10'
              )}
            >
              <Ruler className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden lg:inline">{dict.showDims}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isRo ? 'Comută afișare cote mobilier 3D (Lățime × Înălțime × Adâncime)' : 'Toggle 3D Dimensions in cm'}
          </TooltipContent>
        </Tooltip>

        {/* 3D Tape Measure (2 Points) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              id="btn-top-tape"
              onClick={onToggleTapeMeasure}
              className={cn(
                'inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold shadow-lg backdrop-blur-xl transition',
                isTapeActive
                  ? 'border-rose-500/70 bg-rose-500/25 text-rose-200 shadow-[0_0_18px_rgba(244,63,94,0.25)]'
                  : 'border-white/12 bg-[#14171d]/90 text-zinc-200 hover:bg-white/10'
              )}
            >
              <Crosshair className={cn('h-3.5 w-3.5', isTapeActive ? 'text-rose-300' : 'text-rose-400')} />
              <span className="hidden lg:inline">
                {dict.dimModeTape || (isRo ? 'Ruletă (2 Puncte)' : 'Tape Measure')}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isRo
              ? 'Ruletă Măsurare 3D: Dă click pe 2 puncte pe orice suprafață'
              : '3D Tape Measure: Click any 2 points on surfaces'}
          </TooltipContent>
        </Tooltip>

        {/* Language Switch */}
        <div className="hidden items-center rounded-xl border border-white/12 bg-[#14171d]/90 p-0.5 shadow-lg backdrop-blur-xl sm:inline-flex">
          {['en', 'ru', 'ro'].map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => onChangeLang(l)}
              className={cn(
                'cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold transition',
                lang === l
                  ? 'bg-amber-500/25 text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Side Panel Toggle */}
        <button
          type="button"
          id="btn-toggle-panel"
          onClick={onTogglePanel}
          className={cn(
            'inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-lg backdrop-blur-xl transition',
            panelOpen
              ? 'border-amber-400/55 bg-amber-500/20 text-amber-200'
              : 'border-white/12 bg-[#14171d]/90 text-zinc-100 hover:bg-white/10'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{dict.controlsToggle}</span>
        </button>
      </div>
    </header>
  );
}
