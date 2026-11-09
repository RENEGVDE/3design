'use client';

import React, { useState } from 'react';
import { createPublicSharedProject } from '../utils/firebaseCloud';

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
  onShowToast
}: ShareProjectModalProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [authorName, setAuthorName] = useState('Studio Design & Producție');
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ percent: number; label: string } | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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
        onProgress: (percent, label) => setSyncStatus({ percent, label })
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(6, 9, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(165deg, rgba(19, 25, 42, 0.99), rgba(11, 15, 27, 0.99))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '20px',
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.85)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
              }}
            >
              🔗
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                {isRo
                  ? 'Partajare Prezentare 3D Client (Link Public)'
                  : isRu
                  ? 'Поделиться 3D проектом с клиентом'
                  : 'Share 3D Client Presentation'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                {isRo
                  ? 'Clientul poate roti, mări și deschide ușile/sertarele pe telefon sau PC fără cont'
                  : 'Clients can orbit, zoom & open doors on any phone or PC without login'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Project Info Pill */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{isRo ? 'Proiectul care se partajează:' : 'Sharing project:'}</div>
            <strong style={{ fontSize: '14px', color: '#38bdf8' }}>{projectName || 'Mobilier 3D CAD'}</strong>
          </div>

          {/* Author / Studio Input */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
              {isRo ? 'Numele Designerului / Atelierului (afișat clientului):' : 'Studio / Designer Name:'}
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ex: Studio Mobilă Design"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#fff',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Progress bar */}
          {syncStatus && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '11px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.35)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#38bdf8', marginBottom: '6px', fontWeight: 600 }}>
                <span>{syncStatus.label}</span>
                <span>{syncStatus.percent}%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${syncStatus.percent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #38bdf8, #6366f1)',
                    transition: 'width 0.2s ease'
                  }}
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
              style={{
                padding: '12px 18px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px rgba(2, 132, 199, 0.35)'
              }}
            >
              <span>🔗</span>
              <span>{isGenerating ? (isRo ? 'Se generează linkul...' : 'Generating link...') : (isRo ? 'Creează Linkul de Prezentare Client' : 'Create Client Presentation Link')}</span>
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.35)'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span>
                <span>{isRo ? 'Linkul este gata pentru trimitere!' : 'Link ready to share!'}</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '9px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(15, 23, 42, 0.95)',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '9px',
                    border: 'none',
                    background: copied ? '#22c55e' : '#38bdf8',
                    color: copied ? '#fff' : '#0f172a',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copied ? (isRo ? '✓ Copiat!' : '✓ Copied!') : (isRo ? 'Copiază' : 'Copy')}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '9px',
                    border: '1px solid rgba(37, 211, 102, 0.4)',
                    background: 'rgba(37, 211, 102, 0.16)',
                    color: '#86efac',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>💬</span>
                  <span>Trimite pe WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.open(generatedUrl, '_blank')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '9px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Deschide în filă nouă ↗
                </button>
              </div>
            </div>
          )}

          {/* Benefits summary */}
          <div style={{ fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>🔒 <strong>Mod Protejat (Read-Only):</strong> Clientul nu poate șterge sau altera proiectul tău de producție.</div>
            <div>📱 <strong>Universal:</strong> Funcționează pe iPhone, Android, iPad, Mac și Windows fără a instala nimic.</div>
            <div>🚪 <strong>Interactiv:</strong> Ușile și sertarele se pot deschide și închide prin simplu tap/click.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

