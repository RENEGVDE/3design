'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CloudUserProfile,
  CloudProjectSummary,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logoutCloudUser,
  updateUserDisplayName,
  listUserCloudProjects,
  saveUserCloudProject,
  loadUserCloudProject,
  renameUserCloudProject,
  deleteUserCloudProject,
  getSavedGmailAccountsOnDevice
} from '../utils/firebaseCloud';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  currentUser: CloudUserProfile | null;
  activeCloudProject: { id: string; name: string } | null;
  onGetWorkspacePayload: () => any;
  onCaptureThumbnailDataUrl?: () => string | null;
  onApplyCloudProject: (payload: any, summary: CloudProjectSummary) => Promise<void> | void;
  onShowToast?: (msg: string) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  lang,
  currentUser,
  activeCloudProject,
  onGetWorkspacePayload,
  onCaptureThumbnailDataUrl,
  onApplyCloudProject,
  onShowToast
}: UserProfileModalProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Direct Gmail quick-connect state when domain OAuth popup isn't enabled
  const [googleDirectOpen, setGoogleDirectOpen] = useState(false);
  const [gmailAddress, setGmailAddress] = useState('');
  const [gmailName, setGmailName] = useState('');
  const [gmailPass, setGmailPass] = useState('');
  const [savedGmailAccounts, setSavedGmailAccounts] = useState<
    Array<{ email: string; displayName: string }>
  >([]);

  const [authBusy, setAuthBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile & Cloud Projects state
  const [projects, setProjects] = useState<CloudProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [syncProgress, setSyncProgress] = useState<{ percent: number; label: string } | null>(null);

  // Edit profile name state
  const [editingProfileName, setEditingProfileName] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState('');

  // Rename project state
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const fetchProjects = useCallback(async (uid: string) => {
    setLoadingProjects(true);
    try {
      const list = await listUserCloudProjects(uid);
      setProjects(list);
    } catch (err: any) {
      console.warn('Error fetching cloud projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSavedGmailAccounts(getSavedGmailAccountsOnDevice());
    }
    if (isOpen && currentUser?.uid) {
      fetchProjects(currentUser.uid);
      setProfileNameDraft(currentUser.displayName || '');
      if (!newProjectName) {
        const dateStr = new Date().toLocaleDateString('ro-RO', {
          day: '2-digit',
          month: 'short'
        });
        setNewProjectName(
          activeCloudProject?.name ||
            (isRo ? `Proiect Mobilier (${dateStr})` : isRu ? `Проект мебели (${dateStr})` : `Kitchen Project (${dateStr})`)
        );
      }
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen, currentUser?.uid]);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setAuthBusy(true);
    try {
      if (authTab === 'register') {
        const user = await registerWithEmail(email, password, displayName);
        const msg = isRo
          ? `Cont creat cu succes! Bine ai venit, ${user.displayName}!`
          : isRu
          ? `Аккаунт создан! Добро пожаловать, ${user.displayName}!`
          : `Account created! Welcome, ${user.displayName}!`;
        setSuccessMsg(msg);
        onShowToast?.(`✅ ${msg}`);
      } else {
        const user = await loginWithEmail(email, password);
        const msg = isRo
          ? `Autentificat ca ${user.displayName}`
          : isRu
          ? `Вход выполнен: ${user.displayName}`
          : `Signed in as ${user.displayName}`;
        setSuccessMsg(msg);
        onShowToast?.(`👤 ${msg}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Eroare la autentificare.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleButtonClick = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    // If the user already typed an email in the main input, connect immediately with that Gmail!
    if (email && email.trim().length > 2) {
      setAuthBusy(true);
      try {
        const user = await loginWithGoogle({
          email: email.trim(),
          displayName: displayName.trim() || undefined,
          pinOrPass: password || undefined
        });
        onShowToast?.(`🔵 Conectat cu Google: ${user.email}`);
        return;
      } catch (err: any) {
        setErrorMsg(err?.message || 'Eroare la conectarea cu Gmail.');
      } finally {
        setAuthBusy(false);
      }
      return;
    }

    setSavedGmailAccounts(getSavedGmailAccountsOnDevice());
    setGoogleDirectOpen((prev) => !prev);
  };

  const handleQuickSelectSavedGmail = async (acc: { email: string; displayName: string }) => {
    setErrorMsg(null);
    setAuthBusy(true);
    try {
      const user = await loginWithGoogle({
        email: acc.email,
        displayName: acc.displayName
      });
      setGoogleDirectOpen(false);
      onShowToast?.(`🔵 Conectat cu Gmail: ${user.email}`);
    } catch (err: any) {
      setGmailAddress(acc.email);
      setGmailName(acc.displayName);
      setErrorMsg(err?.message || 'Introdu parola/PIN-ul asociat acestui cont Gmail.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAuthBusy(true);
    try {
      let cleanGmail = gmailAddress.trim().toLowerCase();
      if (cleanGmail && !cleanGmail.includes('@')) {
        cleanGmail = `${cleanGmail}@gmail.com`;
      }
      const user = await loginWithGoogle({
        email: cleanGmail,
        displayName: gmailName.trim() || undefined,
        pinOrPass: gmailPass
      });
      setGoogleDirectOpen(false);
      onShowToast?.(`🔵 Conectat cu Gmail: ${user.email}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Eroare la conectarea cu Gmail.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSaveProjectToCloud = async (overwriteProjectId?: string | null, customTitle?: string) => {
    if (!currentUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    const titleToUse = (customTitle || newProjectName || 'Proiect Mobilier 3D').trim();

    try {
      setSyncProgress({ percent: 5, label: isRo ? 'Se generează captura 3D și datele proiectului...' : 'Preparing 3D project...' });
      const thumb = onCaptureThumbnailDataUrl ? onCaptureThumbnailDataUrl() : null;
      const payload = onGetWorkspacePayload();

      const savedSummary = await saveUserCloudProject(currentUser.uid, titleToUse, payload, {
        existingProjectId: overwriteProjectId || null,
        thumbnailDataUrl: thumb,
        onProgress: (percent, label) => setSyncProgress({ percent, label })
      });

      await fetchProjects(currentUser.uid);
      const msg = isRo
        ? `Proiectul „${savedSummary.name}” a fost salvat în Cloud! Îl poți accesa de pe orice dispozitiv.`
        : isRu
        ? `Проект «${savedSummary.name}» сохранен в облаке!`
        : `Project "${savedSummary.name}" saved to Cloud!`;
      setSuccessMsg(msg);
      onShowToast?.(`☁️ ${msg}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Eroare la salvarea proiectului în Cloud.');
    } finally {
      setTimeout(() => setSyncProgress(null), 900);
    }
  };

  const handleLoadProjectFromCloud = async (proj: CloudProjectSummary) => {
    if (!currentUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setSyncProgress({
        percent: 10,
        label: isRo ? `Se descarcă „${proj.name}” din Cloud...` : `Downloading "${proj.name}"...`
      });
      const { summary, payload } = await loadUserCloudProject(
        currentUser.uid,
        proj.id,
        (percent, label) => setSyncProgress({ percent, label })
      );
      await onApplyCloudProject(payload, summary);
      onShowToast?.(
        isRo
          ? `📂 Proiectul „${summary.name}” a fost încărcat cu succes!`
          : `📂 Project "${summary.name}" loaded!`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Eroare la încărcarea proiectului din Cloud.');
    } finally {
      setTimeout(() => setSyncProgress(null), 600);
    }
  };

  const handleRenameProject = async (projectId: string) => {
    if (!currentUser || !renameDraft.trim()) return;
    try {
      await renameUserCloudProject(currentUser.uid, projectId, renameDraft.trim());
      setRenamingProjectId(null);
      await fetchProjects(currentUser.uid);
      onShowToast?.(isRo ? '✏️ Numele proiectului a fost actualizat.' : '✏️ Project renamed.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Eroare la redenumire.');
    }
  };

  const handleDeleteProject = async (proj: CloudProjectSummary) => {
    if (!currentUser) return;
    const confirmMsg = isRo
      ? `Sigur dorești să ștergi proiectul „${proj.name}” din profilul tău Cloud?`
      : isRu
      ? `Удалить проект «${proj.name}» из облака?`
      : `Delete project "${proj.name}" from your Cloud profile?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteUserCloudProject(currentUser.uid, proj.id);
      await fetchProjects(currentUser.uid);
      onShowToast?.(isRo ? `🗑️ Proiectul „${proj.name}” a fost șters.` : `🗑️ Project deleted.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Eroare la ștergerea proiectului.');
    }
  };

  const handleSaveProfileName = async () => {
    if (!currentUser || !profileNameDraft.trim()) return;
    await updateUserDisplayName(currentUser.uid, profileNameDraft.trim());
    setEditingProfileName(false);
    onShowToast?.(isRo ? '✅ Numele profilului a fost actualizat.' : '✅ Profile updated.');
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts: number) => {
    try {
      return new Date(ts).toLocaleString(isRo ? 'ro-RO' : isRu ? 'ru-RU' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="profile-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(6, 9, 18, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !syncProgress) onClose();
      }}
    >
      <div
        className="profile-modal-card"
        style={{
          width: '100%',
          maxWidth: currentUser ? '780px' : '460px',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(165deg, rgba(19, 25, 42, 0.98), rgba(11, 15, 27, 0.99))',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '20px',
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(56, 189, 248, 0.12)',
          color: '#f8fafc',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
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
                background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '19px',
                boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)'
              }}
            >
              {currentUser ? '☁️' : '👤'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                {currentUser
                  ? isRo
                    ? 'Profilul Meu & Proiecte Cloud'
                    : isRu
                    ? 'Мой профиль и облачные проекты'
                    : 'My Profile & Cloud Projects'
                  : isRo
                  ? 'Contul Meu 3Design Cloud'
                  : isRu
                  ? 'Аккаунт 3Design Cloud'
                  : '3Design Cloud Account'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                {isRo
                  ? 'Salvează mai multe proiecte și lucrează de pe PC, tabletă sau smartphone'
                  : isRu
                  ? 'Сохраняйте проекты и работайте с ПК, планшета или смартфона'
                  : 'Store multiple projects and work across PC, tablet & smartphone'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!!syncProgress}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Închide"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Alerts */}
          {errorMsg && (
            <div
              style={{
                padding: '11px 14px',
                borderRadius: '11px',
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>⚠️</span>
              <span style={{ flex: 1 }}>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '11px 14px',
                borderRadius: '11px',
                background: 'rgba(34, 197, 94, 0.14)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#86efac',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>✅</span>
              <span style={{ flex: 1 }}>{successMsg}</span>
            </div>
          )}

          {/* Sync Progress Bar */}
          {syncProgress && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.35)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#38bdf8',
                  marginBottom: '8px'
                }}
              >
                <span>{syncProgress.label}</span>
                <span>{syncProgress.percent}%</span>
              </div>
              <div
                style={{
                  height: '7px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${syncProgress.percent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #38bdf8, #6366f1)',
                    transition: 'width 0.25s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* ================= UNAUTHENTICATED VIEW ================= */}
          {!currentUser ? (
            <>
              {/* Login / Register Switcher */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  padding: '4px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setErrorMsg(null);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '9px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background:
                      authTab === 'login'
                        ? 'linear-gradient(135deg, #38bdf8, #6366f1)'
                        : 'transparent',
                    color: authTab === 'login' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  {isRo ? '🔐 Autentificare' : isRu ? '🔐 Вход' : '🔐 Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setErrorMsg(null);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '9px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background:
                      authTab === 'register'
                        ? 'linear-gradient(135deg, #38bdf8, #6366f1)'
                        : 'transparent',
                    color: authTab === 'register' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  {isRo ? '✨ Cont Nou' : isRu ? '✨ Регистрация' : '✨ Create Account'}
                </button>
              </div>

              {/* Google / Gmail Button */}
              <button
                type="button"
                onClick={handleGoogleButtonClick}
                disabled={authBusy}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.3 0 10.6 0 12s.6 3.7 1.6 5.6l3.7-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"
                  />
                </svg>
                <span>
                  {isRo
                    ? 'Continuă cu Google / Gmail'
                    : isRu
                    ? 'Войти через Google / Gmail'
                    : 'Continue with Google / Gmail'}
                </span>
              </button>

              {/* Google / Gmail Account Chooser & Quick Sign-In */}
              {googleDirectOpen && (
                <form
                  onSubmit={handleGoogleDirectSubmit}
                  style={{
                    padding: '14px',
                    borderRadius: '13px',
                    background: 'rgba(66, 133, 244, 0.12)',
                    border: '1px solid rgba(66, 133, 244, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#93c5fd' }}>
                    🔵 {isRo ? 'Alege sau introdu contul tău Gmail (Sincronizare Cloud)' : isRu ? 'Вход через аккаунт Gmail' : 'Sign in with your Gmail Account'}
                  </div>

                  {savedGmailAccounts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {savedGmailAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => handleQuickSelectSavedGmail(acc)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 11px',
                            borderRadius: '9px',
                            border: '1px solid rgba(255,255,255,0.16)',
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <span
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #4285F4, #34A853)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                              color: '#fff',
                              flexShrink: 0
                            }}
                          >
                            {(acc.displayName || acc.email).slice(0, 1).toUpperCase()}
                          </span>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{acc.displayName}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{acc.email}</div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>
                            {isRo ? 'Conectează →' : 'Sign in →'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="nume.prenume@gmail.com"
                    value={gmailAddress}
                    onChange={(e) => setGmailAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '9px',
                      border: '1px solid rgba(255,255,255,0.22)',
                      background: 'rgba(15, 23, 42, 0.9)',
                      color: '#fff',
                      fontSize: '13px'
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder={isRo ? 'Nume afișat (opțional)' : 'Display Name'}
                      value={gmailName}
                      onChange={(e) => setGmailName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 11px',
                        borderRadius: '9px',
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: '#fff',
                        fontSize: '12.5px'
                      }}
                    />
                    <input
                      type="password"
                      placeholder={isRo ? 'PIN / Parolă (opțional)' : 'PIN / Password'}
                      value={gmailPass}
                      onChange={(e) => setGmailPass(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 11px',
                        borderRadius: '9px',
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: '#fff',
                        fontSize: '12.5px'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="submit"
                      disabled={authBusy}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '9px',
                        border: 'none',
                        background: '#3b82f6',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {authBusy
                        ? isRo
                          ? 'Se conectează...'
                          : 'Connecting...'
                        : isRo
                        ? '✓ Conectează Contul Gmail'
                        : '✓ Connect Gmail Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleDirectOpen(false)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '9px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'transparent',
                        color: '#94a3b8',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {isRo ? 'Închide' : 'Close'}
                    </button>
                  </div>
                </form>
              )}

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.09)' }} />
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                  {isRo ? 'sau cu email + parolă' : isRu ? 'или email + пароль' : 'or email + password'}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.09)' }} />
              </div>

              {/* Email + Password Form */}
              <form
                onSubmit={handleEmailAuth}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {authTab === 'register' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        color: '#cbd5e1',
                        marginBottom: '5px',
                        fontWeight: 600
                      }}
                    >
                      {isRo ? 'Numele tău / Atelier' : isRu ? 'Ваше имя / Студия' : 'Your Name / Studio'}
                    </label>
                    <input
                      type="text"
                      placeholder={isRo ? 'Ex: Andrei Popescu / Studio Mobilă' : 'Alex Designer'}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 13px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#f8fafc',
                        fontSize: '13.5px'
                      }}
                    />
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: '#cbd5e1',
                      marginBottom: '5px',
                      fontWeight: 600
                    }}
                  >
                    {isRo ? 'Adresă de Email' : isRu ? 'Электронная почта (Email)' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="exemplu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 13px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(15, 23, 42, 0.75)',
                      color: '#f8fafc',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: '#cbd5e1',
                      marginBottom: '5px',
                      fontWeight: 600
                    }}
                  >
                    {isRo ? 'Parolă (minim 6 caractere)' : isRu ? 'Пароль (мин. 6 символов)' : 'Password (min 6 chars)'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete={authTab === 'register' ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 40px 11px 13px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#f8fafc',
                        fontSize: '13.5px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '15px',
                        padding: '4px'
                      }}
                      title={showPassword ? 'Ascunde parola' : 'Arată parola'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '11px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(14, 165, 233, 0.3)'
                  }}
                >
                  {authBusy
                    ? isRo
                      ? 'Se procesează...'
                      : 'Processing...'
                    : authTab === 'register'
                    ? isRo
                      ? '✨ Creează Cont & Activează Cloud'
                      : isRu
                      ? '✨ Создать аккаунт'
                      : '✨ Create Cloud Account'
                    : isRo
                    ? '🔐 Intră în Contul Meu'
                    : isRu
                    ? '🔐 Войти в профиль'
                    : '🔐 Sign In to Profile'}
                </button>
              </form>

              {/* Multi-device benefits footer */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                  textAlign: 'center',
                  fontSize: '11px',
                  color: '#94a3b8'
                }}
              >
                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  ☁️ {isRo ? 'Proiecte Nelimitate' : 'Cloud Projects'}
                </div>
                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  📱💻 {isRo ? 'PC & Smartphone' : 'Multi-Device'}
                </div>
                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  🧱 {isRo ? 'Modele .B3D & .GLB' : 'Full 3D CAD Sync'}
                </div>
              </div>
            </>
          ) : (
            /* ================= AUTHENTICATED VIEW (USER PROFILE & PROJECTS) ================= */
            <>
              {/* User Account Banner */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#fff',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      (currentUser.displayName || currentUser.email || 'U')
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>

                  <div>
                    {editingProfileName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="text"
                          value={profileNameDraft}
                          onChange={(e) => setProfileNameDraft(e.target.value)}
                          style={{
                            padding: '5px 9px',
                            borderRadius: '7px',
                            border: '1px solid #38bdf8',
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: '#fff',
                            fontSize: '13px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveProfileName}
                          style={{
                            padding: '5px 9px',
                            borderRadius: '7px',
                            border: 'none',
                            background: '#22c55e',
                            color: '#fff',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <strong style={{ fontSize: '15px', color: '#f8fafc' }}>
                          {currentUser.displayName}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileNameDraft(currentUser.displayName);
                            setEditingProfileName(true);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '2px'
                          }}
                          title="Editează numele profilului"
                        >
                          ✏️
                        </button>
                        <span
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: 'rgba(34, 197, 94, 0.16)',
                            color: '#86efac',
                            border: '1px solid rgba(34, 197, 94, 0.35)'
                          }}
                        >
                          ● Cloud Activ
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {currentUser.email}{' '}
                      <span style={{ opacity: 0.7 }}>
                        ({currentUser.provider === 'google' ? 'Google / Gmail' : 'Email'})
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await logoutCloudUser();
                    onShowToast?.(isRo ? 'Ai ieșit din cont.' : 'Signed out.');
                  }}
                  style={{
                    padding: '8px 13px',
                    borderRadius: '9px',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#fca5a5',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🚪 {isRo ? 'Deconectare' : isRu ? 'Выйти' : 'Sign Out'}
                </button>
              </div>

              {/* Save Current Scene to Cloud Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.1))',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '11px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#e0f2fe' }}>
                    💾 {isRo ? 'Salvează Scena 3D Curentă în Profilul Tău Cloud' : isRu ? 'Сохранить текущую 3D сцену в облако' : 'Save Current 3D Scene to Cloud'}
                  </div>
                  {activeCloudProject && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#7dd3fc',
                        border: '1px solid rgba(56, 189, 248, 0.4)'
                      }}
                    >
                      {isRo ? 'Proiect activ:' : 'Active:'} <strong>{activeCloudProject.name}</strong>
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <input
                    type="text"
                    placeholder={isRo ? 'Denumire proiect (ex: Bucătărie Apartament 3 Camere)' : 'Project Name'}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    style={{
                      flex: '1 1 220px',
                      padding: '10px 13px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#fff',
                      fontSize: '13px'
                    }}
                  />

                  <button
                    type="button"
                    disabled={!!syncProgress}
                    onClick={() => handleSaveProjectToCloud(null, newProjectName)}
                    style={{
                      padding: '10px 15px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                      color: '#fff',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
                    }}
                  >
                    ➕ {isRo ? 'Salvează ca Proiect Nou' : isRu ? 'Сохранить как новый' : 'Save as New Project'}
                  </button>

                  {activeCloudProject && (
                    <button
                      type="button"
                      disabled={!!syncProgress}
                      onClick={() =>
                        handleSaveProjectToCloud(activeCloudProject.id, activeCloudProject.name)
                      }
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(34, 197, 94, 0.45)',
                        background: 'rgba(34, 197, 94, 0.18)',
                        color: '#86efac',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      🔄 {isRo ? `Actualizează „${activeCloudProject.name}”` : `Update "${activeCloudProject.name}"`}
                    </button>
                  )}
                </div>
              </div>

              {/* Saved Projects Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '4px'
                }}
              >
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#cbd5e1' }}>
                  📂 {isRo ? `Proiectele Mele Salvate (${projects.length})` : isRu ? `Мои проекты (${projects.length})` : `My Saved Projects (${projects.length})`}
                </div>
                <button
                  type="button"
                  onClick={() => fetchProjects(currentUser.uid)}
                  disabled={loadingProjects}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#94a3b8',
                    fontSize: '11.5px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 {loadingProjects ? '...' : isRo ? 'Reîmprospătează' : 'Refresh'}
                </button>
              </div>

              {/* Projects Grid */}
              {loadingProjects && projects.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '13px'
                  }}
                >
                  ⏳ {isRo ? 'Se încarcă proiectele din Cloud...' : 'Loading cloud projects...'}
                </div>
              ) : projects.length === 0 ? (
                <div
                  style={{
                    padding: '32px 20px',
                    textAlign: 'center',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>☁️</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#e2e8f0' }}>
                    {isRo
                      ? 'Nu ai încă niciun proiect salvat în Cloud'
                      : isRu
                      ? 'У вас пока нет сохраненных проектов в облаке'
                      : 'No cloud projects saved yet'}
                  </div>
                  <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
                    {isRo
                      ? 'Apasă pe „Salvează ca Proiect Nou” mai sus pentru a-ți salva scena 3D și a o accesa de pe telefon, tabletă sau alt PC.'
                      : 'Click "Save as New Project" above to store your current 3D kitchen and access it on any device.'}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '12px'
                  }}
                >
                  {projects.map((proj) => {
                    const isActive = activeCloudProject?.id === proj.id;
                    return (
                      <div
                        key={proj.id}
                        style={{
                          borderRadius: '14px',
                          background: isActive
                            ? 'rgba(56, 189, 248, 0.09)'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isActive
                            ? '1px solid rgba(56, 189, 248, 0.45)'
                            : '1px solid rgba(255, 255, 255, 0.09)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        {/* Thumbnail & Header */}
                        <div>
                          <div
                            style={{
                              height: '128px',
                              background: 'rgba(9, 13, 24, 0.85)',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                            }}
                          >
                            {proj.thumbnailDataUrl ? (
                              <img
                                src={proj.thumbnailDataUrl}
                                alt={proj.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <div style={{ textAlign: 'center', color: '#475569' }}>
                                <div style={{ fontSize: '30px' }}>🧊</div>
                                <div style={{ fontSize: '11px' }}>3D CAD Project</div>
                              </div>
                            )}

                            {isActive && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  left: '8px',
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  background: 'rgba(14, 165, 233, 0.9)',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 700
                                }}
                              >
                                ● DESCHIS ACUM
                              </span>
                            )}

                            <span
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: 'rgba(15, 23, 42, 0.85)',
                                color: '#cbd5e1',
                                fontSize: '10.5px',
                                border: '1px solid rgba(255,255,255,0.12)'
                              }}
                            >
                              {formatSize(proj.totalBytes)}
                            </span>
                          </div>

                          <div style={{ padding: '12px 14px' }}>
                            {renamingProjectId === proj.id ? (
                              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                                <input
                                  type="text"
                                  value={renameDraft}
                                  onChange={(e) => setRenameDraft(e.target.value)}
                                  style={{
                                    flex: 1,
                                    padding: '5px 8px',
                                    borderRadius: '7px',
                                    border: '1px solid #38bdf8',
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    color: '#fff',
                                    fontSize: '12.5px'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenameProject(proj.id)}
                                  style={{
                                    padding: '5px 9px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: '#22c55e',
                                    color: '#fff',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingProjectId(null)}
                                  style={{
                                    padding: '5px 7px',
                                    borderRadius: '7px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  color: '#f8fafc',
                                  marginBottom: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '6px'
                                }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {proj.name}
                                </span>
                              </div>
                            )}

                            <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              <span>🕒 {formatDate(proj.updatedAt)}</span>
                              <span>📦 {proj.modelsCount} corpuri 3D</span>
                              {proj.roomSummary && <span>📐 {proj.roomSummary}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div
                          style={{
                            padding: '10px 14px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(0, 0, 0, 0.18)'
                          }}
                        >
                          <button
                            type="button"
                            disabled={!!syncProgress}
                            onClick={() => handleLoadProjectFromCloud(proj)}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            📂 {isRo ? 'Deschide' : isRu ? 'Открыть' : 'Open'}
                          </button>

                          <button
                            type="button"
                            disabled={!!syncProgress}
                            onClick={() => handleSaveProjectToCloud(proj.id, proj.name)}
                            title={isRo ? 'Suprascrie cu scena 3D curentă' : 'Overwrite with current scene'}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              background: 'rgba(56, 189, 248, 0.1)',
                              color: '#7dd3fc',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            💾
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRenamingProjectId(proj.id);
                              setRenameDraft(proj.name);
                            }}
                            title={isRo ? 'Redenumește proiectul' : 'Rename project'}
                            style={{
                              padding: '8px 9px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              background: 'rgba(255, 255, 255, 0.04)',
                              color: '#cbd5e1',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProject(proj)}
                            title={isRo ? 'Șterge proiectul din Cloud' : 'Delete project'}
                            style={{
                              padding: '8px 9px',
                              borderRadius: '8px',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#fca5a5',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

