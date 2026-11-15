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
      <DialogContent className="max-w-xl border-white/[0.08] bg-[#0F1115]/98 p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#17789E] bg-[#0F5773] text-white">
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
          <div className="flex flex-col gap-1 rounded-lg border border-white/[0.08] bg-[#14171C] px-3.5 py-3">
            <span className="text-[11px] text-[#8B949E]">
              {isRo ? 'Proiectul care se partajează:' : 'Sharing project:'}
            </span>
            <strong className="text-sm font-semibold text-[#F5F7FA]">
              {projectName || 'Mobilier 3D CAD'}
            </strong>
          </div>

          {/* Author / Studio Input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#C9D1D9]">
              {isRo
                ? 'Numele Designerului / Atelierului (afișat clientului):'
                : 'Studio / Designer Name:'}
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ex: Studio Mobilă Design"
              className="w-full rounded-lg border border-white/[0.1] bg-[#14171C] px-3 py-2.5 text-sm text-[#F5F7FA] outline-none transition focus:border-[#0F5773]"
            />
          </div>

          {/* Progress bar */}
          {syncStatus && (
            <div className="rounded-lg border border-[#17789E] bg-[#0F5773]/25 p-3">
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-white">
                <span>{syncStatus.label}</span>
                <span>{syncStatus.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#262B34]">
                <div
                  className="h-full bg-[#0F5773] transition-all duration-200"
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
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#17789E] bg-[#0F5773] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#146E91] disabled:pointer-events-none disabled:opacity-50"
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
            <div className="flex flex-col gap-3 rounded-xl border border-[#355E43] bg-[#1F3627]/35 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Check className="h-4 w-4" />
                <span>{isRo ? 'Linkul este gata pentru trimitere!' : 'Link ready to share!'}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 rounded-lg border border-white/[0.12] bg-[#090A0C] px-3 py-2 text-xs text-[#F5F7FA] outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap',
                    copied
                      ? 'border-[#355E43] bg-[#1F3627] text-white'
                      : 'border-[#17789E] bg-[#0F5773] text-white hover:bg-[#146E91]'
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
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#355E43] bg-[#1F3627] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2A4935]"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Trimite pe WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.open(generatedUrl, '_blank')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1C2027] px-3 py-2.5 text-xs font-medium text-[#C9D1D9] transition hover:bg-[#262B34] hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Deschide</span>
                </button>
              </div>
            </div>
          )}

          {/* Benefits summary */}
          <div className="flex flex-col gap-1.5 border-t border-white/[0.08] pt-3 text-[11px] text-[#8B949E]">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 shrink-0 text-[#C9D1D9]" />
              <span>
                <strong className="text-[#F5F7FA]">Mod Protejat (Read-Only):</strong> Clientul nu poate șterge sau altera proiectul tău.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 shrink-0 text-[#C9D1D9]" />
              <span>
                <strong className="text-[#F5F7FA]">Universal:</strong> Funcționează pe iPhone, Android, iPad, Mac și Windows fără cont.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-3.5 w-3.5 shrink-0 text-[#C9D1D9]" />
              <span>
                <strong className="text-[#F5F7FA]">Interactiv:</strong> Ușile și sertarele se pot deschide prin simplu tap/click.
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
