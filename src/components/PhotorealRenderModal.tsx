'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Camera from 'lucide-react/icons/camera';
import {
  PhotorealRenderSettings,
  PostProcessSettings,
  DEFAULT_RENDER_SETTINGS,
  DEFAULT_POST_PROCESS,
  RawRenderBuffer,
  renderPhotorealScene,
  applyPostProcessingToCanvas,
  RenderAtmospherePreset,
  RenderBackdropMode
} from '../utils/photorealRenderer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Slider } from './ui/slider';

export interface PhotorealRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  onGetSceneContext: () => any;
  onShowToast?: (msg: string) => void;
}

export default function PhotorealRenderModal({
  isOpen,
  onClose,
  lang,
  onGetSceneContext,
  onShowToast
}: PhotorealRenderModalProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [renderSettings, setRenderSettings] = useState<PhotorealRenderSettings>(
    DEFAULT_RENDER_SETTINGS
  );
  const [postSettings, setPostSettings] = useState<PostProcessSettings>(
    DEFAULT_POST_PROCESS
  );

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<{
    percent: number;
    pass: number;
    total: number;
  } | null>(null);
  const [rawBuffer, setRawBuffer] = useState<RawRenderBuffer | null>(null);

  const cancelRef = useRef(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const startRenderPass = useCallback(
    async (customSettings?: PhotorealRenderSettings) => {
      const ctx = onGetSceneContext();
      if (!ctx || !ctx.renderer || !ctx.scene || !ctx.camera) return;

      const cfg = customSettings || renderSettings;
      cancelRef.current = false;
      setIsRendering(true);
      setProgress({ percent: 0, pass: 0, total: cfg.samples });

      try {
        const buf = await renderPhotorealScene(
          ctx,
          cfg,
          (percent, pass, total) => {
            setProgress({ percent, pass, total });
          },
          () => cancelRef.current
        );
        setRawBuffer(buf);
        if (previewCanvasRef.current) {
          applyPostProcessingToCanvas(buf, postSettings, previewCanvasRef.current);
        }
      } catch (err) {
        console.error('Photoreal render error:', err);
      } finally {
        setIsRendering(false);
        setProgress(null);
      }
    },
    [onGetSceneContext, renderSettings, postSettings]
  );

  // Automatically run an initial fast studio render when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startRenderPass({
          ...renderSettings,
          samples: Math.min(renderSettings.samples, 16)
        });
      }, 120);
      return () => {
        clearTimeout(timer);
        cancelRef.current = true;
      };
    } else {
      cancelRef.current = true;
    }
  }, [isOpen]);

  // Re-apply post-processing instantaneously whenever postSettings change
  useEffect(() => {
    if (rawBuffer && previewCanvasRef.current) {
      applyPostProcessingToCanvas(rawBuffer, postSettings, previewCanvasRef.current);
    }
  }, [rawBuffer, postSettings]);

  const handleDownloadImage = (format: 'png' | 'jpeg') => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mime, 0.96);
    const a = document.createElement('a');
    a.href = dataUrl;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `render-fotorealist-3d-${ts}.${format === 'png' ? 'png' : 'jpg'}`;
    a.click();
    onShowToast?.(
      isRo
        ? `📸 Imaginea fotorealistă (${canvas.width}×${canvas.height}) a fost descărcată!`
        : `📸 Photorealistic render (${canvas.width}×${canvas.height}) downloaded!`
    );
  };

  const updateRenderSetting = <K extends keyof PhotorealRenderSettings>(
    key: K,
    val: PhotorealRenderSettings[K],
    autoRerender = false
  ) => {
    const next = { ...renderSettings, [key]: val };
    setRenderSettings(next);
    if (autoRerender && !isRendering) {
      startRenderPass(next);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          cancelRef.current = true;
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[92dvh] max-w-6xl flex-col overflow-hidden border-white/15 bg-gradient-to-b from-[#121826]/99 to-[#0a0e18]/99 p-0">
        {/* Header */}
        <DialogHeader className="mb-0 border-b border-white/10 bg-white/[0.02] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-pink-500 text-white shadow-lg shadow-amber-500/30">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>
                {isRo
                  ? 'Studio Randare 3D Fotorealistă (Ray-Shadow & Post-Processing)'
                  : isRu
                  ? 'Студия фотореалистичного 3D рендера'
                  : 'Photorealistic 3D Render Studio'}
              </DialogTitle>
              <DialogDescription>
                {isRo
                  ? 'Acumulare multi-pas de umbre moi (Soft Area Shadows), reflexii PBR și procesare fotografică în timp real'
                  : 'Multi-pass soft area shadows, PBR reflections & live photographic color grading'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Main Body: Responsive Split Layout */}
        <div className="flex flex-1 flex-wrap overflow-y-auto">
          {/* Left Column: Photo Preview Viewport */}
          <div className="flex-[1_1_560px] min-h-[320px] bg-[#070a12] flex flex-col items-center justify-center p-4 relative border-r border-white/[0.07]">
            <div className="w-full max-h-[64dvh] flex items-center justify-center relative rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.65)] border border-white/10">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-[62dvh] w-auto h-auto block object-contain"
              />

              {/* Live Render Progress Overlay */}
              {isRendering && progress && (
                <div className="absolute inset-0 bg-[#070a12]/65 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6">
                  <div className="text-[28px]">✨</div>
                  <div className="text-sm font-bold text-slate-50">
                    {isRo
                      ? `Se randează imaginea fotorealistă... ${progress.percent}%`
                      : `Rendering photorealistic image... ${progress.percent}%`}
                  </div>
                  <div className="text-xs text-slate-400">
                    {isRo
                      ? `Pasul ${progress.pass} din ${progress.total} (Acumulare umbre moi & anti-aliasing)`
                      : `Pass ${progress.pass} of ${progress.total} (Soft shadows & SSAA)`}
                  </div>
                  <div className="w-[260px] h-2 rounded-full bg-white/12 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-pink-500 transition-[width] duration-150"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Bar under Preview */}
            <div className="w-full mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
              <div className="text-[11.5px] text-slate-400">
                📐 {renderSettings.width} × {renderSettings.height} px • {renderSettings.samples} samples Ray-Shadow
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isRendering}
                  onClick={() => startRenderPass(renderSettings)}
                  className="px-4 py-2.5 rounded-[10px] border-none bg-gradient-to-br from-amber-500 to-pink-500 text-white text-[12.5px] font-bold cursor-pointer shadow-[0_4px_15px_rgba(245,158,11,0.35)] hover:brightness-110 disabled:opacity-50 transition"
                >
                  🎬 {isRo ? 'Randează la Calitate Maximă' : isRu ? 'Рендер в макс. качестве' : 'Render Full Quality'}
                </button>

                <button
                  type="button"
                  disabled={isRendering || !rawBuffer}
                  onClick={() => handleDownloadImage('png')}
                  className="px-3.5 py-2.5 rounded-[10px] border border-emerald-500/45 bg-emerald-500/15 text-emerald-300 text-[12.5px] font-bold cursor-pointer hover:bg-emerald-500/25 disabled:opacity-45 transition"
                >
                  📥 {isRo ? 'Descarcă PNG' : 'Download PNG'}
                </button>

                <button
                  type="button"
                  disabled={isRendering || !rawBuffer}
                  onClick={() => handleDownloadImage('jpeg')}
                  className="px-3.5 py-2.5 rounded-[10px] border border-sky-400/45 bg-sky-400/15 text-sky-300 text-[12.5px] font-bold cursor-pointer hover:bg-sky-400/25 disabled:opacity-45 transition"
                >
                  📥 {isRo ? 'Descarcă JPG' : 'Download JPG'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Studio Controls */}
          <div className="flex-[1_1_340px] max-w-[420px] p-[18px] overflow-y-auto flex flex-col gap-4">
            {/* 1. Atmosphere Preset */}
            <div>
              <div className="text-[11.5px] font-bold text-slate-300 mb-[7px]">
                ☀️ {isRo ? '1. ILUMINARE & ATMOSFERĂ STUDIO' : '1. LIGHTING & ATMOSPHERE'}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    {
                      id: 'daylight',
                      label: isRo ? '☀️ Lumina Zilei (5500K)' : '☀️ Daylight (5500K)'
                    },
                    {
                      id: 'golden_hour',
                      label: isRo ? '🌅 Apus Cald (3700K)' : '🌅 Golden Hour (3700K)'
                    },
                    {
                      id: 'studio_catalog',
                      label: isRo ? '🎬 Studio Catalog' : '🎬 Catalog Studio'
                    },
                    {
                      id: 'luxury_evening',
                      label: isRo ? '🌙 Seară Showroom' : '🌙 Luxury Evening'
                    }
                  ] as { id: RenderAtmospherePreset; label: string }[]
                ).map((item) => {
                  const active = renderSettings.atmosphere === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isRendering}
                      onClick={() => updateRenderSetting('atmosphere', item.id, true)}
                      className={`px-2.5 py-2 rounded-[9px] border text-[11.5px] font-semibold cursor-pointer text-left transition ${
                        active
                          ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Backdrop & Floor */}
            <div>
              <div className="text-[11.5px] font-bold text-slate-300 mb-[7px]">
                🏛️ {isRo ? '2. AMBIENT CAMERĂ & PODEA' : '2. ROOM & FLOOR BACKDROP'}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    {
                      id: 'warm_parquet_walls',
                      label: isRo ? '🪵 Parchet Stejar & Pereți' : '🪵 Oak Floor & Walls'
                    },
                    {
                      id: 'marble_showroom',
                      label: isRo ? '🏛️ Marmură & Reflexii' : '🏛️ Polished Marble'
                    },
                    {
                      id: 'studio_cyclorama',
                      label: isRo ? '📸 Fundal Studio Foto' : '📸 Studio Cyclorama'
                    },
                    {
                      id: 'current_scene',
                      label: isRo ? '🧱 Scena Actuală' : '🧱 Current Scene'
                    }
                  ] as { id: RenderBackdropMode; label: string }[]
                ).map((item) => {
                  const active = renderSettings.backdrop === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isRendering}
                      onClick={() => updateRenderSetting('backdrop', item.id, true)}
                      className={`px-2.5 py-2 rounded-[9px] border text-[11.5px] font-semibold cursor-pointer text-left transition ${
                        active
                          ? 'border-sky-400 bg-sky-400/18 text-sky-300'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Resolution & Samples */}
            <div>
              <div className="text-[11.5px] font-bold text-slate-300 mb-[7px]">
                📐 {isRo ? '3. REZOLUȚIE & CALITATE UMBRE (SAMPLES)' : '3. RESOLUTION & SAMPLES'}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[
                  { label: 'Full HD 1080p', w: 1920, h: 1080 },
                  { label: '2K QHD', w: 2560, h: 1440 },
                  { label: '4K Ultra', w: 3840, h: 2160 }
                ].map((res) => {
                  const active = renderSettings.width === res.w && renderSettings.height === res.h;
                  return (
                    <button
                      key={res.label}
                      type="button"
                      disabled={isRendering}
                      onClick={() => {
                        const next = { ...renderSettings, width: res.w, height: res.h };
                        setRenderSettings(next);
                      }}
                      className={`px-1.5 py-[7px] rounded-lg border text-[11px] font-semibold cursor-pointer transition ${
                        active
                          ? 'border-purple-500 bg-purple-500/22 text-purple-200'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {res.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: isRo ? '⚡ Rapid (12x)' : '⚡ Fast (12x)', s: 12 },
                  { label: isRo ? '✨ Studio (24x)' : '✨ Studio (24x)', s: 24 },
                  { label: isRo ? '💎 Ultra (48x)' : '💎 Ultra (48x)', s: 48 }
                ].map((q) => {
                  const active = renderSettings.samples === q.s;
                  return (
                    <button
                      key={q.s}
                      type="button"
                      disabled={isRendering}
                      onClick={() => updateRenderSetting('samples', q.s, false)}
                      className={`px-1.5 py-[7px] rounded-lg border text-[11px] font-semibold cursor-pointer transition ${
                        active
                          ? 'border-amber-500 bg-amber-500/22 text-amber-200'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Live Photographic Post-Processing Sliders (Radix UI) */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] font-bold text-slate-50">
                  🎚️ {isRo ? 'REGLAJE FOTO LIVE (INSTANT)' : 'LIVE PHOTO GRADING'}
                </span>
                <button
                  type="button"
                  onClick={() => setPostSettings(DEFAULT_POST_PROCESS)}
                  className="bg-transparent border-none text-sky-400 text-[11px] cursor-pointer hover:underline"
                >
                  Reset
                </button>
              </div>

              {(
                [
                  {
                    key: 'exposure',
                    label: `☀️ ${isRo ? 'Expunere (Luminozitate)' : 'Exposure'}`,
                    min: 0.65,
                    max: 1.5,
                    step: 0.02,
                    display: `${Math.round(postSettings.exposure * 100)}%`
                  },
                  {
                    key: 'contrast',
                    label: `🌗 ${isRo ? 'Contrast Filmic' : 'Filmic Contrast'}`,
                    min: 0.85,
                    max: 1.45,
                    step: 0.02,
                    display: `${Math.round(postSettings.contrast * 100)}%`
                  },
                  {
                    key: 'warmth',
                    label: `🌡️ ${isRo ? 'Balans de Alb (Rece ↔ Cald)' : 'Warmth Balance'}`,
                    min: -35,
                    max: 35,
                    step: 1,
                    display: postSettings.warmth > 0 ? `+${postSettings.warmth}` : `${postSettings.warmth}`
                  },
                  {
                    key: 'saturation',
                    label: `🎨 ${isRo ? 'Saturație Culori & Texturi' : 'Saturation'}`,
                    min: 0.6,
                    max: 1.45,
                    step: 0.02,
                    display: `${Math.round(postSettings.saturation * 100)}%`
                  },
                  {
                    key: 'bloom',
                    label: `✨ ${isRo ? 'Glow Lumină (Specular Bloom)' : 'Highlight Bloom'}`,
                    min: 0,
                    max: 0.85,
                    step: 0.02,
                    display: `${Math.round(postSettings.bloom * 100)}%`
                  },
                  {
                    key: 'vignette',
                    label: `📷 ${isRo ? 'Vignetare Obiectiv Foto' : 'Lens Vignette'}`,
                    min: 0,
                    max: 0.75,
                    step: 0.02,
                    display: `${Math.round(postSettings.vignette * 100)}%`
                  }
                ] as {
                  key: keyof PostProcessSettings;
                  label: string;
                  min: number;
                  max: number;
                  step: number;
                  display: string;
                }[]
              ).map((s) => (
                <div key={s.key} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>{s.label}</span>
                    <span>{s.display}</span>
                  </div>
                  <Slider
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={[postSettings[s.key]]}
                    onValueChange={([v]) =>
                      setPostSettings((p) => ({ ...p, [s.key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

