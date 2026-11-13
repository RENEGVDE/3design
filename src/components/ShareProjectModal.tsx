'use client';

import React, { useState } from 'react';
import Link2 from 'lucide-react/icons/link-2';
import Check from 'lucide-react/icons/check';
import Copy from 'lucide-react/icons/copy';
import MessageCircle from 'lucide-react/icons/message-circle';
import ExternalLink from 'lucide-react/icons/external-link';
import Lock from 'lucide-react/icons/lock';
import Smartphone from 'lucide-react/icons/smartphone';
import DoorOpen from 'lucide-react/icons/door-open';
import { createPublicSharedProject } from '../utils/firebaseCloud';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { cn } from '../utils/cn';

export interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  projectName: string;
  onGetWorkspacePayload: () => any;
  onCaptureThumbnailDataUrl?: () => string | null;
  onShowToast?: (msg: string) => void;
}

export default function ShareProjectModal({
  isOpen,
  onClose,
  lang,
  projectName,
  onGetWorkspacePayload,
  onCaptureThumbnailDataUrl,
  onShowToast,
}: ShareProjectModalProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [authorName, setAuthorName] = useState('Studio Design & Producție');
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ percent: number; label: string } | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setGeneratedUrl(null);
    setCopied(false);

    try {
      const payload = onGetWorkspacePayload();
      const thumb = onCaptureThumbnailDataUrl ? onCaptureThumbnailDataUrl() : null;

      const res = await createPublicSharedProject(projectName, payload, {
        authorName,
        thumbnailDataUrl: thumb,
        onProgress: (percent, label) => setSyncStatus({ percent, label }),
      });

      setGeneratedUrl(res.shareUrl);
      onShowToast?.(isRo ? '🔗 Link public de prezentare generat cu succes!' : '🔗 Public share link created!');
    } catch (err: any) {
      console.error('Failed to create share link:', err);
      alert(err?.message || 'Eroare la generarea link-ului.');
    } finally {
      setIsGenerating(false);
      setSyncStatus(null);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
      onShowToast?.(isRo ? '📋 Link copiat în clipboard!' : '📋 Link copied!');
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = () => {
    if (!generatedUrl) return;
    const msg = isRo
      ? `Bună ziua! Vă trimit prezentarea 3D interactivă pentru proiectul „${projectName}”: ${generatedUrl}\nPuteți deschide link-ul pe telefon, tabletă sau PC pentru a vedea bucătăria în 3D și a deschide ușile/sertarele.`
      : `Hello! Here is the interactive 3D presentation for "${projectName}": ${generatedUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isGenerating && onClose()}>
      <DialogContent className="max-w-xl border-sky-500/25 bg-gradient-to-b from-[#13192a]/98 to-[#0b0f1b]/98 p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>
                {isRo
                  ? 'Partajare Prezentare 3D Client (Link Public)'
                  : isRu
                  ? 'Поделиться 3D проектом с клиентом'
                  : 'Share 3D Client Presentation'}
              </DialogTitle>
              <DialogDescription>
                {isRo
                  ? 'Clientul poate roti, mări și deschide ușile/sertarele pe telefon sau PC fără cont'
                  : 'Clients can orbit, zoom & open doors on any phone or PC without login'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Project Info Pill */}
          <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
            <span className="text-[11px] text-zinc-400">
              {isRo ? 'Proiectul care se partajează:' : 'Sharing project:'}
            </span>
            <strong className="text-sm font-bold text-sky-400">
              {projectName || 'Mobilier 3D CAD'}
            </strong>
          </div>

          {/* Author / Studio Input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
              {isRo
                ? 'Numele Designerului / Atelierului (afișat clientului):'
                : 'Studio / Designer Name:'}
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ex: Studio Mobilă Design"
              className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
          </div>

          {/* Progress bar */}
          {syncStatus && (
            <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 p-3">
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-sky-400">
                <span>{syncStatus.label}</span>
                <span>{syncStatus.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-200"
                  style={{ width: `${syncStatus.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Generate Button or Result */}
          {!generatedUrl ? (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateLink}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/30 transition hover:from-sky-500 hover:to-blue-500 disabled:pointer-events-none disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              <span>
                {isGenerating
                  ? isRo
                    ? 'Se generează linkul...'
                    : 'Generating link...'
                  : isRo
                  ? 'Creează Linkul de Prezentare Client'
                  : 'Create Client Presentation Link'}
              </span>
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Check className="h-4 w-4" />
                <span>{isRo ? 'Linkul este gata pentru trimitere!' : 'Link ready to share!'}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 rounded-lg border border-white/20 bg-slate-950/90 px-3 py-2 text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap',
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                  )}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? (isRo ? 'Copiat!' : 'Copied!') : isRo ? 'Copiază' : 'Copy'}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Trimite pe WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.open(generatedUrl, '_blank')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Deschide</span>
                </button>
              </div>
            </div>
          )}

          {/* Benefits summary */}
          <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3 text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>
                <strong className="text-zinc-200">Mod Protejat (Read-Only):</strong> Clientul nu poate șterge sau altera proiectul tău.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 shrink-0 text-sky-400" />
              <span>
                <strong className="text-zinc-200">Universal:</strong> Funcționează pe iPhone, Android, iPad, Mac și Windows fără cont.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>
                <strong className="text-zinc-200">Interactiv:</strong> Ușile și sertarele se pot deschide prin simplu tap/click.
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
