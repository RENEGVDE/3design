'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Cloud from 'lucide-react/icons/cloud';
import User from 'lucide-react/icons/user';
import LogOut from 'lucide-react/icons/log-out';
import Save from 'lucide-react/icons/save';
import FolderOpen from 'lucide-react/icons/folder-open';
import Pencil from 'lucide-react/icons/pencil';
import Trash2 from 'lucide-react/icons/trash-2';
import Eye from 'lucide-react/icons/eye';
import EyeOff from 'lucide-react/icons/eye-off';
import Check from 'lucide-react/icons/check';
import X from 'lucide-react/icons/x';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Mail from 'lucide-react/icons/mail';
import Lock from 'lucide-react/icons/lock';
import Sparkles from 'lucide-react/icons/sparkles';
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
  getSavedGmailAccountsOnDevice,
} from '../utils/firebaseCloud';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '../utils/cn';

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
  onShowToast,
}: UserProfileModalProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const [projects, setProjects] = useState<CloudProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [syncProgress, setSyncProgress] = useState<{ percent: number; label: string } | null>(null);

  const [editingProfileName, setEditingProfileName] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState('');

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
          month: 'short',
        });
        setNewProjectName(
          activeCloudProject?.name ||
            (isRo
              ? `Proiect Mobilier (${dateStr})`
              : isRu
              ? `Проект мебели (${dateStr})`
              : `Kitchen Project (${dateStr})`)
        );
      }
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen, currentUser?.uid]);

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
    if (email && email.trim().length > 2) {
      setAuthBusy(true);
      try {
        const user = await loginWithGoogle({
          email: email.trim(),
          displayName: displayName.trim() || undefined,
          pinOrPass: password || undefined,
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
        displayName: acc.displayName,
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
        pinOrPass: gmailPass,
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
      setSyncProgress({
        percent: 5,
        label: isRo ? 'Se generează captura 3D și datele proiectului...' : 'Preparing 3D project...',
      });
      const thumb = onCaptureThumbnailDataUrl ? onCaptureThumbnailDataUrl() : null;
      const payload = onGetWorkspacePayload();

      const savedSummary = await saveUserCloudProject(currentUser.uid, titleToUse, payload, {
        existingProjectId: overwriteProjectId || null,
        thumbnailDataUrl: thumb,
        onProgress: (percent, label) => setSyncProgress({ percent, label }),
      });

      await fetchProjects(currentUser.uid);
      const msg = isRo
        ? `Proiectul „${savedSummary.name}” a fost salvat în Cloud!`
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
        label: isRo ? `Se descarcă „${proj.name}” din Cloud...` : `Downloading "${proj.name}"...`,
      });
      const { summary, payload } = await loadUserCloudProject(
        currentUser.uid,
        proj.id,
        (percent, label) => setSyncProgress({ percent, label })
      );
      await onApplyCloudProject(payload, summary);
      onShowToast?.(
        isRo ? `📂 Proiectul „${summary.name}” a fost încărcat!` : `📂 Project "${summary.name}" loaded!`
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
      onShowToast?.(isRo ? `🗑️ Proiectul „${proj.name}” a fost șters.` : '🗑️ Project deleted.');
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
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !syncProgress && onClose()}>
      <DialogContent
        className={cn(
          'border-white/15 bg-gradient-to-b from-[#13192a]/98 to-[#0b0f1b]/99 p-0 overflow-hidden',
          currentUser ? 'max-w-3xl' : 'max-w-md'
        )}
      >
        {/* Header */}
        <DialogHeader className="mb-0 border-b border-white/10 bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25">
              {currentUser ? <Cloud className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle>
                {currentUser
                  ? isRo
                    ? 'Profilul Meu & Proiecte Cloud'
                    : isRu
                    ? 'Мой профиль и облачные проекты'
                    : 'My Profile & Cloud Projects'
                  : isRo
                  ? 'Autentificare & Sincronizare Cloud'
                  : isRu
                  ? 'Вход и облачная синхронизация'
                  : 'Sign In & Cloud Sync'}
              </DialogTitle>
              <DialogDescription>
                {isRo
                  ? 'Accesează proiectele tale 3D de pe PC, tabletă sau telefon'
                  : 'Access your 3D furniture projects across all your devices'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-300">
              ✅ {successMsg}
            </div>
          )}

          {syncProgress && (
            <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 p-3">
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-sky-300">
                <span>{syncProgress.label}</span>
                <span>{syncProgress.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-200"
                  style={{ width: `${syncProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {!currentUser ? (
            /* AUTH VIEW */
            <div className="space-y-4">
              <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as 'login' | 'register')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">
                    {isRo ? 'Conectare' : isRu ? 'Вход' : 'Sign In'}
                  </TabsTrigger>
                  <TabsTrigger value="register">
                    {isRo ? 'Cont Nou' : isRu ? 'Регистрация' : 'Register'}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {authTab === 'register' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      {isRo ? 'Nume / Atelier' : 'Name / Studio'}
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Studio Design"
                      className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nume@gmail.com"
                      className="w-full rounded-xl border border-white/15 bg-slate-900/90 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    {isRo ? 'Parolă' : isRu ? 'Пароль' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full rounded-xl border border-white/15 bg-slate-900/90 py-2 pl-9 pr-9 text-sm text-white outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-2 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50"
                >
                  {authBusy
                    ? '...'
                    : authTab === 'register'
                    ? isRo
                      ? 'Creează Cont Cloud'
                      : 'Create Cloud Account'
                    : isRo
                    ? 'Intră în Cont'
                    : 'Sign In'}
                </button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-white/10" />
                <span className="mx-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {isRo ? 'sau rapid cu Gmail' : 'or quick Gmail'}
                </span>
                <div className="flex-grow border-t border-white/10" />
              </div>

              <button
                type="button"
                disabled={authBusy}
                onClick={handleGoogleButtonClick}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] py-2.5 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
              >
                <Sparkles className="h-4 w-4 text-sky-400" />
                <span>{isRo ? 'Conectare Rapidă cu Google / Gmail' : 'Quick Connect with Google / Gmail'}</span>
              </button>

              {googleDirectOpen && (
                <div className="space-y-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5">
                  {savedGmailAccounts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-sky-300">
                        {isRo ? 'Conturi salvate pe acest dispozitiv:' : 'Saved accounts:'}
                      </div>
                      {savedGmailAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => handleQuickSelectSavedGmail(acc)}
                          className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left text-xs hover:bg-black/50"
                        >
                          <span className="font-semibold text-white">{acc.displayName}</span>
                          <span className="text-zinc-400">{acc.email}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleGoogleDirectSubmit} className="space-y-2">
                    <input
                      type="text"
                      required
                      value={gmailAddress}
                      onChange={(e) => setGmailAddress(e.target.value)}
                      placeholder="adresa@gmail.com"
                      className="w-full rounded-lg border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white outline-none"
                    />
                    <input
                      type="text"
                      value={gmailName}
                      onChange={(e) => setGmailName(e.target.value)}
                      placeholder={isRo ? 'Nume afișat (opțional)' : 'Display name'}
                      className="w-full rounded-lg border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white outline-none"
                    />
                    <input
                      type="password"
                      value={gmailPass}
                      onChange={(e) => setGmailPass(e.target.value)}
                      placeholder={isRo ? 'PIN / Parolă sincronizare (opțional)' : 'Sync PIN (optional)'}
                      className="w-full rounded-lg border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white outline-none"
                    />
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full cursor-pointer rounded-lg bg-sky-500 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
                    >
                      {isRo ? 'Conectează Gmail' : 'Connect Gmail'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* LOGGED IN CLOUD PROJECTS VIEW */
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-base font-extrabold text-white">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    {editingProfileName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={profileNameDraft}
                          onChange={(e) => setProfileNameDraft(e.target.value)}
                          className="rounded-lg border border-sky-400/50 bg-slate-900 px-2 py-1 text-xs text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveProfileName}
                          className="cursor-pointer rounded-md bg-emerald-500/20 p-1 text-emerald-300 hover:bg-emerald-500/30"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProfileName(false)}
                          className="cursor-pointer rounded-md bg-white/10 p-1 text-zinc-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{currentUser.displayName}</span>
                        <button
                          type="button"
                          onClick={() => setEditingProfileName(true)}
                          className="cursor-pointer text-zinc-400 hover:text-white"
                          title="Editează nume"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-zinc-400">{currentUser.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await logoutCloudUser();
                    onShowToast?.(isRo ? '👋 Deconectat.' : '👋 Signed out.');
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{isRo ? 'Deconectare' : 'Sign Out'}</span>
                </button>
              </div>

              {/* Save Current Scene to Cloud */}
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3.5 space-y-2.5">
                <div className="text-xs font-bold text-sky-300">
                  ☁️ {isRo ? 'Salvează Scena 3D Curentă în Cloud' : 'Save Current 3D Scene to Cloud'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={isRo ? 'Nume proiect...' : 'Project name...'}
                    className="min-w-[200px] flex-1 rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    disabled={!!syncProgress}
                    onClick={() => handleSaveProjectToCloud(null)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isRo ? 'Salvează Nou' : 'Save New'}</span>
                  </button>
                  {activeCloudProject && (
                    <button
                      type="button"
                      disabled={!!syncProgress}
                      onClick={() => handleSaveProjectToCloud(activeCloudProject.id, activeCloudProject.name)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>{isRo ? 'Actualizează Activ' : 'Update Active'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Saved Projects Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {isRo ? `Proiectele Tale (${projects.length})` : `Your Projects (${projects.length})`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => fetchProjects(currentUser.uid)}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                  >
                    <RefreshCw className={cn('h-3 w-3', loadingProjects && 'animate-spin')} />
                    <span>{isRo ? 'Reîmprospătează' : 'Refresh'}</span>
                  </button>
                </div>

                {loadingProjects && projects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-400">
                    {isRo ? 'Se încarcă proiectele...' : 'Loading projects...'}
                  </div>
                ) : projects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 py-8 text-center text-xs text-zinc-400">
                    {isRo
                      ? 'Nu ai niciun proiect salvat în Cloud încă. Salvează scena curentă mai sus!'
                      : 'No cloud projects saved yet.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className={cn(
                          'flex flex-col overflow-hidden rounded-2xl border bg-white/[0.03] transition',
                          activeCloudProject?.id === proj.id
                            ? 'border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                            : 'border-white/10 hover:border-white/20'
                        )}
                      >
                        <div className="flex flex-1 flex-col">
                          {proj.thumbnailDataUrl && (
                            <div className="relative h-28 w-full overflow-hidden bg-black/40">
                              <img
                                src={proj.thumbnailDataUrl}
                                alt={proj.name}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200 backdrop-blur-sm">
                                {formatSize(proj.totalBytes)}
                              </span>
                            </div>
                          )}

                          <div className="p-3 space-y-1.5">
                            {renamingProjectId === proj.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={renameDraft}
                                  onChange={(e) => setRenameDraft(e.target.value)}
                                  className="flex-1 rounded-lg border border-sky-400/50 bg-slate-900 px-2 py-1 text-xs text-white outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenameProject(proj.id)}
                                  className="cursor-pointer rounded-md bg-emerald-500/20 p-1 text-emerald-300"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingProjectId(null)}
                                  className="cursor-pointer rounded-md bg-white/10 p-1 text-zinc-300"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="truncate text-sm font-bold text-white">{proj.name}</div>
                            )}

                            <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                              <span>🕒 {formatDate(proj.updatedAt)}</span>
                              <span>📦 {proj.modelsCount} corpuri</span>
                              {proj.roomSummary && <span>📐 {proj.roomSummary}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 border-t border-white/10 bg-black/25 p-2.5">
                          <button
                            type="button"
                            disabled={!!syncProgress}
                            onClick={() => handleLoadProjectFromCloud(proj)}
                            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                            <span>{isRo ? 'Deschide' : isRu ? 'Открыть' : 'Open'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={!!syncProgress}
                            onClick={() => handleSaveProjectToCloud(proj.id, proj.name)}
                            title={isRo ? 'Suprascrie cu scena curentă' : 'Overwrite'}
                            className="cursor-pointer rounded-lg border border-sky-400/30 bg-sky-500/10 p-1.5 text-sky-300 hover:bg-sky-500/20"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingProjectId(proj.id);
                              setRenameDraft(proj.name);
                            }}
                            title={isRo ? 'Redenumește' : 'Rename'}
                            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(proj)}
                            title={isRo ? 'Șterge' : 'Delete'}
                            className="cursor-pointer rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
