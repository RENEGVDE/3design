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
      <div className="pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#0F1115]/95 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#17789E] bg-[#0F5773] text-xs font-bold tracking-wider text-white">
          3D
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[0.88rem] font-semibold tracking-tight text-[#F5F7FA]">
              {dict.title}
            </h1>
            {isSharedReadOnly && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#355E43] bg-[#1F3627] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                <Eye className="h-3 w-3" />
                {isRo ? 'Prezentare Client' : isRu ? 'Просмотр Клиента' : 'Client View'}
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-[#8B949E]">
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
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0F1115]/95 px-2.5 text-xs font-medium text-[#F5F7FA] shadow-lg backdrop-blur-xl transition hover:border-white/20 hover:bg-[#1C2027] data-[state=open]:border-[#17789E] data-[state=open]:bg-[#0F5773] data-[state=open]:text-white"
            >
              <FolderOpen className="h-3.5 w-3.5 text-[#8B949E]" />
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
                  className="border border-[#17789E]/60 bg-[#0F5773]/25 hover:bg-[#0F5773]/40"
                >
                  <Cloud className="h-4 w-4 shrink-0 text-white" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">
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
                    <span className="text-[10px] text-[#C9D1D9]">
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
                className="mb-1 border border-[#355E43]/70 bg-[#1F3627]/60 hover:bg-[#2A4935]"
              >
                <Share2 className="h-4 w-4 shrink-0 text-white" />
                <div className="flex flex-col">
                  <span className="font-semibold text-white">
                    {isRo
                      ? 'Partajează cu Clientul (Link 3D)'
                      : isRu
                      ? 'Поделиться 3D с клиентом'
                      : 'Share 3D with Client'}
                  </span>
                  <span className="text-[10px] text-[#C9D1D9]">
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
              <FilePlus className="h-4 w-4 shrink-0 text-[#8B949E]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#F5F7FA]">
                  {isRo
                    ? 'Proiect Nou (Scenă Curată CAD)'
                    : isRu
                    ? 'Новый проект (Чистая сцена)'
                    : 'New Project (Clean CAD Space)'}
                </span>
                <span className="text-[10px] text-[#8B949E]">
                  {isRo
                    ? 'Spațiu de lucru liber cu grilă milimetrică CAD'
                    : 'Clean workspace with millimeter CAD grid'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => onSaveProject?.()}>
              <Save className="h-4 w-4 shrink-0 text-[#8B949E]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#F5F7FA]">
                  {isRo
                    ? 'Salvează Proiect (.json / .cadproj)'
                    : isRu
                    ? 'Сохранить проект (.json / .cadproj)'
                    : 'Save Project (.json / .cadproj)'}
                </span>
                <span className="text-[10px] text-[#8B949E]">
                  {isRo
                    ? 'Fișier standard cu corpuri, cote și finisaje'
                    : 'Standard project file with models & materials'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 shrink-0 text-[#8B949E]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#F5F7FA]">
                  {isRo
                    ? 'Încarcă Proiect sau Model (.glb, .b3d, .obj)'
                    : isRu
                    ? 'Открыть проект или модель (.glb, .b3d, .obj)'
                    : 'Open Project or 3D Model (.glb, .b3d, .obj)'}
                </span>
                <span className="text-[10px] text-[#8B949E]">
                  {isRo
                    ? 'Recunoaște automat modele 3D și proiecte'
                    : 'Auto-detects 3D models & projects'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onExportSceneGlb?.()}>
              <Box className="h-4 w-4 shrink-0 text-[#8B949E]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#F5F7FA]">
                  {isRo ? 'Exportă Scenă 3D (.glb)' : isRu ? 'Экспорт 3D сцены (.glb)' : 'Export 3D Scene (.glb)'}
                </span>
                <span className="text-[10px] text-[#8B949E]">
                  {isRo ? 'Model 3D complet pentru Blender / 3ds Max' : 'Binary 3D model for rendering'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onExportSceneB3D?.()}>
              <Layers className="h-4 w-4 shrink-0 text-[#8B949E]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#F5F7FA]">
                  {isRo ? 'Exportă Model Tehnic CAD (.b3d)' : isRu ? 'Экспорт CAD (.b3d)' : 'Export Technical CAD (.b3d)'}
                </span>
                <span className="text-[10px] text-[#8B949E]">
                  {isRo ? 'Panouri (mm), canturi ABS și feronerie' : 'Panels (mm), ABS edge bands & hardware'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onExportSceneObj?.()}>
              <Box className="h-4 w-4 shrink-0 text-[#8B949E]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#F5F7FA]">
                  {isRo ? 'Exportă Geometrie CAD (.obj + .mtl)' : isRu ? 'Экспорт геометрии (.obj + .mtl)' : 'Export CAD Geometry (.obj + .mtl)'}
                </span>
                <span className="text-[10px] text-[#8B949E]">
                  {isRo ? 'Format geometric universal CAD & CNC' : 'Universal geometric format for CAD & CNC'}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {onToggle2DPlanMode && (
              <DropdownMenuItem onClick={onToggle2DPlanMode}>
                <Map className="h-4 w-4 shrink-0 text-[#8B949E]" />
                <div className="flex flex-col">
                  <span className="font-medium text-[#F5F7FA]">
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
                  <span className="text-[10px] text-[#8B949E]">
                    {isRo ? 'Vedere tehnică de sus cu pereți și cote' : 'Top-down layout of room & furniture'}
                  </span>
                </div>
              </DropdownMenuItem>
            )}

            {onOpenPhotorealRender && (
              <DropdownMenuItem onClick={onOpenPhotorealRender}>
                <Sparkles className="h-4 w-4 shrink-0 text-[#F5F7FA]" />
                <div className="flex flex-col">
                  <span className="font-semibold text-white">
                    {isRo
                      ? 'Studio Randare 3D Fotorealistă'
                      : isRu
                      ? 'Фотореалистичный 3D Рендер'
                      : 'Photorealistic 3D Render Studio'}
                  </span>
                  <span className="text-[10px] text-[#8B949E]">
                    {isRo ? 'Umbre moi, iluminare 5500K și export 4K' : 'Soft shadows, lighting & 4K export'}
                  </span>
                </div>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => onOpenTechnicalReport?.()}>
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#8B949E]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#F5F7FA]">
                  {isRo
                    ? 'Fișă Tehnică & Raport Fabricație'
                    : isRu
                    ? 'Техническая карта'
                    : 'Technical Spec & Cutting List'}
                </span>
                <span className="text-[10px] text-[#8B949E]">
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
                'hidden h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-lg backdrop-blur-xl transition md:inline-flex',
                magneticSnapEnabled
                  ? 'border-[#17789E] bg-[#0F5773] text-white'
                  : 'border-white/[0.08] bg-[#0F1115]/95 text-[#C9D1D9] hover:bg-[#1C2027]'
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
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#17789E] bg-[#0F5773] px-2.5 text-xs font-medium text-white shadow-lg backdrop-blur-xl transition hover:bg-[#146E91]"
            >
              <Camera className="h-3.5 w-3.5" />
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
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#355E43] bg-[#1F3627] px-2.5 text-xs font-medium text-white shadow-lg backdrop-blur-xl transition hover:bg-[#2A4935]"
              >
                <Share2 className="h-3.5 w-3.5" />
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
              className="hidden h-8 cursor-pointer items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0F1115]/95 px-2.5 text-xs font-medium text-[#C9D1D9] shadow-lg backdrop-blur-xl transition hover:bg-[#1C2027] hover:text-white disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
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
              className="hidden h-8 cursor-pointer items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0F1115]/95 px-2.5 text-xs font-medium text-[#C9D1D9] shadow-lg backdrop-blur-xl transition hover:bg-[#1C2027] hover:text-white disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
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
                'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-lg backdrop-blur-xl transition',
                dimsEnabled && !isTapeActive
                  ? 'border-[#17789E] bg-[#0F5773] text-white'
                  : 'border-white/[0.08] bg-[#0F1115]/95 text-[#C9D1D9] hover:bg-[#1C2027]'
              )}
            >
              <Ruler className="h-3.5 w-3.5" />
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
                'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-lg backdrop-blur-xl transition',
                isTapeActive
                  ? 'border-[#355E43] bg-[#1F3627] text-white'
                  : 'border-white/[0.08] bg-[#0F1115]/95 text-[#C9D1D9] hover:bg-[#1C2027]'
              )}
            >
              <Crosshair className="h-3.5 w-3.5" />
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
        <div className="hidden items-center rounded-lg border border-white/[0.08] bg-[#0F1115]/95 p-0.5 shadow-lg backdrop-blur-xl sm:inline-flex">
          {['en', 'ru', 'ro'].map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => onChangeLang(l)}
              className={cn(
                'cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition',
                lang === l
                  ? 'bg-[#0F5773] text-white'
                  : 'text-[#8B949E] hover:text-[#F5F7FA]'
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
            'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-lg backdrop-blur-xl transition',
            panelOpen
              ? 'border-[#17789E] bg-[#0F5773] text-white'
              : 'border-white/[0.08] bg-[#0F1115]/95 text-[#F5F7FA] hover:bg-[#1C2027]'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{dict.controlsToggle}</span>
        </button>
      </div>
    </header>
  );
}
