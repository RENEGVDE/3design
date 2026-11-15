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
          'border-[#262B34] bg-[#0F1115] p-0 overflow-hidden',
          currentUser ? 'max-w-3xl' : 'max-w-md'
        )}
      >
        {/* Header */}
        <DialogHeader className="mb-0 border-b border-white/[0.08] bg-[#14171C] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F5773] border border-[#17789E]/60 text-[#F5F7FA]">
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
            <div className="rounded-xl border border-[#355E43] bg-[#1F3627] px-3.5 py-2.5 text-xs font-medium text-[#F5F7FA]">
              ✅ {successMsg}
            </div>
          )}

          {syncProgress && (
            <div className="rounded-xl border border-[#17789E]/60 bg-[#0F5773]/25 p-3">
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#F5F7FA]">
                <span>{syncProgress.label}</span>
                <span>{syncProgress.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#1C2027]">
                <div
                  className="h-full bg-[#0F5773] transition-all duration-200"
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
                    <label className="mb-1 block text-xs font-semibold text-[#C9D1D9]">
                      {isRo ? 'Nume / Atelier' : 'Name / Studio'}
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Studio Design"
                      className="w-full rounded-xl border border-[#262B34] bg-[#090A0C] px-3 py-2 text-sm text-[#F5F7FA] outline-none focus:border-[#0F5773]"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#C9D1D9]">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#8B949E]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nume@gmail.com"
                      className="w-full rounded-xl border border-[#262B34] bg-[#090A0C] py-2 pl-9 pr-3 text-sm text-[#F5F7FA] outline-none focus:border-[#0F5773]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#C9D1D9]">
                    {isRo ? 'Parolă' : isRu ? 'Пароль' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#8B949E]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full rounded-xl border border-[#262B34] bg-[#090A0C] py-2 pl-9 pr-9 text-sm text-[#F5F7FA] outline-none focus:border-[#0F5773]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-2 text-[#8B949E] hover:text-[#F5F7FA] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full cursor-pointer rounded-xl bg-[#0F5773] border border-[#17789E] py-2.5 text-sm font-bold text-[#F5F7FA] transition hover:bg-[#146E91] disabled:opacity-50"
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
                <div className="flex-grow border-t border-white/[0.08]" />
                <span className="mx-3 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                  {isRo ? 'sau rapid cu Gmail' : 'or quick Gmail'}
                </span>
                <div className="flex-grow border-t border-white/[0.08]" />
              </div>

              <button
                type="button"
                disabled={authBusy}
                onClick={handleGoogleButtonClick}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#262B34] bg-[#14171C] py-2.5 text-xs font-semibold text-[#F5F7FA] transition hover:bg-[#1C2027]"
              >
                <Sparkles className="h-4 w-4 text-[#C9D1D9]" />
                <span>{isRo ? 'Conectare Rapidă cu Google / Gmail' : 'Quick Connect with Google / Gmail'}</span>
              </button>

              {googleDirectOpen && (
                <div className="space-y-3 rounded-xl border border-[#17789E]/50 bg-[#0F5773]/15 p-3.5">
                  {savedGmailAccounts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#C9D1D9]">
                        {isRo ? 'Conturi salvate pe acest dispozitiv:' : 'Saved accounts:'}
                      </div>
                      {savedGmailAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => handleQuickSelectSavedGmail(acc)}
                          className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/[0.08] bg-[#090A0C] px-3 py-2 text-left text-xs hover:bg-[#14171C]"
                        >
                          <span className="font-semibold text-[#F5F7FA]">{acc.displayName}</span>
                          <span className="text-[#8B949E]">{acc.email}</span>
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
                      className="w-full rounded-lg border border-[#262B34] bg-[#090A0C] px-3 py-2 text-xs text-[#F5F7FA] outline-none focus:border-[#0F5773]"
                    />
                    <input
                      type="text"
                      value={gmailName}
                      onChange={(e) => setGmailName(e.target.value)}
                      placeholder={isRo ? 'Nume afișat (opțional)' : 'Display name'}
                      className="w-full rounded-lg border border-[#262B34] bg-[#090A0C] px-3 py-2 text-xs text-[#F5F7FA] outline-none focus:border-[#0F5773]"
                    />
                    <input
                      type="password"
                      value={gmailPass}
                      onChange={(e) => setGmailPass(e.target.value)}
                      placeholder={isRo ? 'PIN / Parolă sincronizare (opțional)' : 'Sync PIN (optional)'}
                      className="w-full rounded-lg border border-[#262B34] bg-[#090A0C] px-3 py-2 text-xs text-[#F5F7FA] outline-none focus:border-[#0F5773]"
                    />
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full cursor-pointer rounded-lg bg-[#0F5773] border border-[#17789E] py-2 text-xs font-bold text-[#F5F7FA] hover:bg-[#146E91]"
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#14171C] p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0F5773] border border-[#17789E]/60 text-base font-extrabold text-[#F5F7FA]">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    {editingProfileName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={profileNameDraft}
                          onChange={(e) => setProfileNameDraft(e.target.value)}
                          className="rounded-lg border border-[#17789E] bg-[#090A0C] px-2 py-1 text-xs text-[#F5F7FA] outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveProfileName}
                          className="cursor-pointer rounded-md bg-[#1F3627] border border-[#355E43] p-1 text-[#F5F7FA] hover:bg-[#2A4935]"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProfileName(false)}
                          className="cursor-pointer rounded-md bg-[#1C2027] p-1 text-[#C9D1D9] hover:bg-[#262B34]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F5F7FA]">{currentUser.displayName}</span>
                        <button
                          type="button"
                          onClick={() => setEditingProfileName(true)}
                          className="cursor-pointer text-[#8B949E] hover:text-[#F5F7FA]"
                          title="Editează nume"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-[#8B949E]">{currentUser.email}</div>
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
              <div className="rounded-2xl border border-[#17789E]/50 bg-[#0F5773]/15 p-3.5 space-y-2.5">
                <div className="text-xs font-bold text-[#F5F7FA]">
                  ☁️ {isRo ? 'Salvează Scena 3D Curentă în Cloud' : 'Save Current 3D Scene to Cloud'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={isRo ? 'Nume proiect...' : 'Project name...'}
                    className="min-w-[200px] flex-1 rounded-xl border border-[#262B34] bg-[#090A0C] px-3 py-2 text-xs text-[#F5F7FA] outline-none focus:border-[#0F5773]"
                  />
                  <button
                    type="button"
                    disabled={!!syncProgress}
                    onClick={() => handleSaveProjectToCloud(null)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0F5773] border border-[#17789E] px-4 py-2 text-xs font-bold text-[#F5F7FA] hover:bg-[#146E91] disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isRo ? 'Salvează Nou' : 'Save New'}</span>
                  </button>
                  {activeCloudProject && (
                    <button
                      type="button"
                      disabled={!!syncProgress}
                      onClick={() => handleSaveProjectToCloud(activeCloudProject.id, activeCloudProject.name)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#355E43] bg-[#1F3627] px-3 py-2 text-xs font-bold text-[#F5F7FA] hover:bg-[#2A4935] disabled:opacity-50"
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">
                    {isRo ? `Proiectele Tale (${projects.length})` : `Your Projects (${projects.length})`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => fetchProjects(currentUser.uid)}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-[#8B949E] hover:text-[#F5F7FA]"
                  >
                    <RefreshCw className={cn('h-3 w-3', loadingProjects && 'animate-spin')} />
                    <span>{isRo ? 'Reîmprospătează' : 'Refresh'}</span>
                  </button>
                </div>

                {loadingProjects && projects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8B949E]">
                    {isRo ? 'Se încarcă proiectele...' : 'Loading projects...'}
                  </div>
                ) : projects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#262B34] py-8 text-center text-xs text-[#8B949E]">
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
                          'flex flex-col overflow-hidden rounded-2xl border bg-[#14171C] transition',
                          activeCloudProject?.id === proj.id
                            ? 'border-[#17789E]'
                            : 'border-white/[0.08] hover:border-white/[0.16]'
                        )}
                      >
                        <div className="flex flex-1 flex-col">
                          {proj.thumbnailDataUrl && (
                            <div className="relative h-28 w-full overflow-hidden bg-[#090A0C]">
                              <img
                                src={proj.thumbnailDataUrl}
                                alt={proj.name}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute right-2 top-2 rounded-md bg-[#090A0C]/85 px-1.5 py-0.5 text-[10px] font-semibold text-[#C9D1D9] backdrop-blur-sm">
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
                                  className="flex-1 rounded-lg border border-[#17789E] bg-[#090A0C] px-2 py-1 text-xs text-[#F5F7FA] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenameProject(proj.id)}
                                  className="cursor-pointer rounded-md bg-[#1F3627] border border-[#355E43] p-1 text-[#F5F7FA]"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingProjectId(null)}
                                  className="cursor-pointer rounded-md bg-[#1C2027] p-1 text-[#C9D1D9]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="truncate text-sm font-bold text-[#F5F7FA]">{proj.name}</div>
                            )}

                            <div className="flex flex-wrap gap-2 text-[11px] text-[#8B949E]">
                              <span>🕒 {formatDate(proj.updatedAt)}</span>
                              <span>📦 {proj.modelsCount} corpuri</span>
                              {proj.roomSummary && <span>📐 {proj.roomSummary}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 border-t border-white/[0.08] bg-[#090A0C]/60 p-2.5">
                          <button
                            type="button"
                            disabled={!!syncProgress}
                            onClick={() => handleLoadProjectFromCloud(proj)}
                            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#0F5773] border border-[#17789E] px-3 py-1.5 text-xs font-bold text-[#F5F7FA] hover:bg-[#146E91] disabled:opacity-50"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                            <span>{isRo ? 'Deschide' : isRu ? 'Открыть' : 'Open'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={!!syncProgress}
                            onClick={() => handleSaveProjectToCloud(proj.id, proj.name)}
                            title={isRo ? 'Suprascrie cu scena curentă' : 'Overwrite'}
                            className="cursor-pointer rounded-lg border border-[#355E43] bg-[#1F3627] p-1.5 text-[#F5F7FA] hover:bg-[#2A4935]"
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
                            className="cursor-pointer rounded-lg border border-[#262B34] bg-[#1C2027] p-1.5 text-[#C9D1D9] hover:bg-[#262B34]"
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
