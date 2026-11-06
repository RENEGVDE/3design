import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'trysmthwtf',
  appId: '1:112661314888:web:858a961e52b91d7334c77d',
  storageBucket: 'trysmthwtf.firebasestorage.app',
  apiKey: 'AIzaSyBo_867jy7vCHv-abJ2Bl33X43VjLxvQ04',
  authDomain: 'trysmthwtf.firebaseapp.com',
  messagingSenderId: '112661314888'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface CloudUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  provider: 'email' | 'google';
  createdAt: number;
}

export interface CloudProjectSummary {
  id: string;
  uid: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  modelsCount: number;
  appliancesCount: number;
  roomSummary: string;
  thumbnailDataUrl: string | null;
  chunkCount: number;
  totalBytes: number;
}

const LS_USER_KEY = 'bucatarie_3d_cloud_user_v1';
const LS_KNOWN_GMAIL_ACCOUNTS_KEY = 'bucatarie_3d_known_gmail_accounts_v1';
const LS_ACTIVE_PROJECT_KEY = 'bucatarie_3d_active_cloud_project_v1';
const IDB_CLOUD_CACHE_DB = 'Bucatarie3DCloudCache_v1';
const IDB_PROJECTS_STORE = 'cloud_projects_cache';
const IDB_ACCOUNTS_STORE = 'local_accounts_fallback';

// Helper: deterministic email key & SHA-256 hash
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'fnv_' + (h >>> 0).toString(16);
}

async function getDeterministicUidForEmail(email: string): Promise<string> {
  const clean = normalizeEmail(email);
  const hash = await sha256Hex('3design_uid_v1:' + clean);
  return 'usr_' + hash.slice(0, 24);
}

async function hashPassword(email: string, password: string): Promise<string> {
  const clean = normalizeEmail(email);
  return sha256Hex(`3design_pw_salt_v1:${clean}:${password}`);
}

export function getSavedGmailAccountsOnDevice(): Array<{ email: string; displayName: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_KNOWN_GMAIL_ACCOUNTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveGmailAccountOnDevice(email: string, displayName: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedGmailAccountsOnDevice().filter((a) => a.email !== email);
    existing.unshift({ email, displayName });
    window.localStorage.setItem(
      LS_KNOWN_GMAIL_ACCOUNTS_KEY,
      JSON.stringify(existing.slice(0, 5))
    );
  } catch {
    // Ignore
  }
}

// IndexedDB cache for offline resilience and instant loads
function openCloudCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('No IndexedDB'));
    }
    const req = window.indexedDB.open(IDB_CLOUD_CACHE_DB, 1);
    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const idb = (e.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains(IDB_PROJECTS_STORE)) {
        idb.createObjectStore(IDB_PROJECTS_STORE, { keyPath: 'cacheKey' });
      }
      if (!idb.objectStoreNames.contains(IDB_ACCOUNTS_STORE)) {
        idb.createObjectStore(IDB_ACCOUNTS_STORE, { keyPath: 'uid' });
      }
    };
    req.onsuccess = (e: Event) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e: Event) => reject((e.target as IDBOpenDBRequest).error);
  });
}

async function cacheProjectLocally(uid: string, summary: CloudProjectSummary, payloadJson: string) {
  try {
    const idb = await openCloudCacheDB();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction(IDB_PROJECTS_STORE, 'readwrite');
      tx.objectStore(IDB_PROJECTS_STORE).put({
        cacheKey: `${uid}__${summary.id}`,
        uid,
        summary,
        payloadJson
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore local cache errors
  }
}

async function getCachedProjectsForUser(uid: string): Promise<CloudProjectSummary[]> {
  try {
    const idb = await openCloudCacheDB();
    return await new Promise<CloudProjectSummary[]>((resolve) => {
      const tx = idb.transaction(IDB_PROJECTS_STORE, 'readonly');
      const req = tx.objectStore(IDB_PROJECTS_STORE).getAll();
      req.onsuccess = () => {
        const all = Array.isArray(req.result) ? req.result : [];
        const list = all
          .filter((item: any) => item && item.uid === uid && item.summary)
          .map((item: any) => item.summary as CloudProjectSummary);
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function getCachedProjectPayload(uid: string, projectId: string): Promise<string | null> {
  try {
    const idb = await openCloudCacheDB();
    return await new Promise<string | null>((resolve) => {
      const tx = idb.transaction(IDB_PROJECTS_STORE, 'readonly');
      const req = tx.objectStore(IDB_PROJECTS_STORE).get(`${uid}__${projectId}`);
      req.onsuccess = () => resolve(req.result?.payloadJson || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteCachedProjectLocally(uid: string, projectId: string) {
  try {
    const idb = await openCloudCacheDB();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction(IDB_PROJECTS_STORE, 'readwrite');
      tx.objectStore(IDB_PROJECTS_STORE).delete(`${uid}__${projectId}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

// Auth listeners management
type AuthListener = (user: CloudUserProfile | null) => void;
const authListeners = new Set<AuthListener>();

function notifyAuthListeners(user: CloudUserProfile | null) {
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        window.localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(LS_USER_KEY);
      }
    } catch {
      // Ignore storage error
    }
  }
  authListeners.forEach((cb) => {
    try {
      cb(user);
    } catch {
      // Ignore listener error
    }
  });
}

export function getPersistedCloudUser(): CloudUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid && parsed.email) return parsed as CloudUserProfile;
  } catch {
    // Ignore
  }
  return null;
}

export function getActiveCloudProjectMeta(): { id: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_ACTIVE_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.name) return parsed;
  } catch {
    // Ignore
  }
  return null;
}

export function setActiveCloudProjectMeta(meta: { id: string; name: string } | null) {
  if (typeof window === 'undefined') return;
  try {
    if (meta) {
      window.localStorage.setItem(LS_ACTIVE_PROJECT_KEY, JSON.stringify(meta));
    } else {
      window.localStorage.removeItem(LS_ACTIVE_PROJECT_KEY);
    }
  } catch {
    // Ignore
  }
}

export function subscribeToAuthChanges(cb: AuthListener): () => void {
  authListeners.add(cb);
  const current = getPersistedCloudUser();
  cb(current);

  return () => {
    authListeners.delete(cb);
  };
}

/**
 * Register a new user with Email + Password in Cloud Firestore.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<CloudUserProfile> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Te rugăm să introduci o adresă de email validă.');
  }
  if (!password || password.length < 6) {
    throw new Error('Parola trebuie să conțină cel puțin 6 caractere.');
  }
  const cleanName = (displayName || cleanEmail.split('@')[0]).trim();
  const uid = await getDeterministicUidForEmail(cleanEmail);
  const passwordHash = await hashPassword(cleanEmail, password);

  try {
    const accountRef = doc(db, 'cloud_accounts', uid);
    const existingSnap = await getDoc(accountRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data && data.passwordHash) {
        // If the user entered the exact same password, sign them right in!
        if (data.passwordHash === passwordHash) {
          const existingProfile: CloudUserProfile = {
            uid,
            email: cleanEmail,
            displayName: data.displayName || cleanName,
            photoURL: data.photoURL || null,
            provider: data.provider || 'email',
            createdAt: data.createdAt || Date.now()
          };
          notifyAuthListeners(existingProfile);
          return existingProfile;
        }
        throw new Error('Există deja un cont cu acest email. Folosește opțiunea de Autentificare (Login).');
      }
    }

    const profile: CloudUserProfile = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: null,
      provider: cleanEmail.endsWith('@gmail.com') ? 'google' : 'email',
      createdAt: Date.now()
    };

    await setDoc(accountRef, {
      ...profile,
      passwordHash,
      updatedAt: Date.now()
    });

    if (cleanEmail.endsWith('@gmail.com')) {
      saveGmailAccountOnDevice(cleanEmail, cleanName);
    }

    notifyAuthListeners(profile);
    return profile;
  } catch (err: any) {
    if (err?.message?.includes('Există deja')) throw err;
    const profile: CloudUserProfile = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: null,
      provider: cleanEmail.endsWith('@gmail.com') ? 'google' : 'email',
      createdAt: Date.now()
    };
    notifyAuthListeners(profile);
    return profile;
  }
}

/**
 * Sign in an existing user with Email + Password across any device.
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<CloudUserProfile> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Introdu o adresă de email validă.');
  }
  if (!password) {
    throw new Error('Introdu parola contului.');
  }

  const uid = await getDeterministicUidForEmail(cleanEmail);
  const passwordHash = await hashPassword(cleanEmail, password);

  const accountRef = doc(db, 'cloud_accounts', uid);
  const snap = await getDoc(accountRef);

  if (snap.exists()) {
    const data = snap.data();
    if (data.passwordHash && data.passwordHash !== passwordHash) {
      throw new Error('Parola introdusă este incorectă.');
    }
    if (!data.passwordHash) {
      // Save password hash if account was previously created via quick Gmail sign-in without password
      await setDoc(accountRef, { passwordHash, updatedAt: Date.now() }, { merge: true });
    }
    const profile: CloudUserProfile = {
      uid,
      email: cleanEmail,
      displayName: data.displayName || cleanEmail.split('@')[0],
      photoURL: data.photoURL || null,
      provider: data.provider || (cleanEmail.endsWith('@gmail.com') ? 'google' : 'email'),
      createdAt: data.createdAt || Date.now()
    };
    if (cleanEmail.endsWith('@gmail.com')) {
      saveGmailAccountOnDevice(cleanEmail, profile.displayName);
    }
    notifyAuthListeners(profile);
    return profile;
  }

  throw new Error('Nu am găsit niciun cont asociat cu acest email. Creează un cont nou în tabul „Cont Nou” sau folosește „Continuă cu Google / Gmail”.');
}

/**
 * Sign in or register with a Google / Gmail account synced via Cloud Firestore across all devices.
 */
export async function loginWithGoogle(gmailInfo: {
  email: string;
  displayName?: string;
  pinOrPass?: string;
}): Promise<CloudUserProfile> {
  let cleanEmail = normalizeEmail(gmailInfo?.email || '');
  if (!cleanEmail) {
    throw new Error('Introdu adresa ta de Gmail (ex: nume@gmail.com).');
  }
  if (!cleanEmail.includes('@')) {
    cleanEmail = `${cleanEmail}@gmail.com`;
  }

  const uid = await getDeterministicUidForEmail(cleanEmail);
  const accountRef = doc(db, 'cloud_accounts', uid);
  const existingSnap = await getDoc(accountRef);

  const passwordHash = gmailInfo.pinOrPass?.trim()
    ? await hashPassword(cleanEmail, gmailInfo.pinOrPass.trim())
    : null;

  if (existingSnap.exists()) {
    const data = existingSnap.data();
    if (data.passwordHash && passwordHash && data.passwordHash !== passwordHash) {
      throw new Error('Parola / codul PIN pentru acest cont Gmail nu corespunde.');
    }
    const resolvedName =
      gmailInfo.displayName?.trim() || data.displayName || cleanEmail.split('@')[0];
    const profile: CloudUserProfile = {
      uid,
      email: cleanEmail,
      displayName: resolvedName,
      photoURL: data.photoURL || null,
      provider: 'google',
      createdAt: data.createdAt || Date.now()
    };
    await setDoc(
      accountRef,
      {
        ...profile,
        ...(passwordHash && !data.passwordHash ? { passwordHash } : {}),
        updatedAt: Date.now()
      },
      { merge: true }
    );
    saveGmailAccountOnDevice(cleanEmail, resolvedName);
    notifyAuthListeners(profile);
    return profile;
  } else {
    const resolvedName = (gmailInfo.displayName || cleanEmail.split('@')[0]).trim();
    const profile: CloudUserProfile = {
      uid,
      email: cleanEmail,
      displayName: resolvedName,
      photoURL: null,
      provider: 'google',
      createdAt: Date.now()
    };
    await setDoc(accountRef, {
      ...profile,
      ...(passwordHash ? { passwordHash } : {}),
      updatedAt: Date.now()
    });
    saveGmailAccountOnDevice(cleanEmail, resolvedName);
    notifyAuthListeners(profile);
    return profile;
  }
}

export async function updateUserDisplayName(
  uid: string,
  newDisplayName: string
): Promise<CloudUserProfile | null> {
  const current = getPersistedCloudUser();
  if (!current || current.uid !== uid) return null;
  const cleanName = newDisplayName.trim();
  if (!cleanName) return current;

  const updated: CloudUserProfile = {
    ...current,
    displayName: cleanName
  };
  try {
    const accountRef = doc(db, 'cloud_accounts', uid);
    await setDoc(accountRef, { displayName: cleanName, updatedAt: Date.now() }, { merge: true });
  } catch {
    // Ignore offline error
  }
  notifyAuthListeners(updated);
  return updated;
}

export async function logoutCloudUser(): Promise<void> {
  notifyAuthListeners(null);
}

/**
 * List all saved projects for a user from Cloud Firestore (with local IndexedDB fallback).
 */
export async function listUserCloudProjects(uid: string): Promise<CloudProjectSummary[]> {
  if (!uid) return [];
  const cachedList = await getCachedProjectsForUser(uid);
  try {
    const projectsCol = collection(db, 'users', uid, 'projects');
    const snap = await getDocs(projectsCol);
    const cloudList: CloudProjectSummary[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.name) {
        cloudList.push({
          id: docSnap.id,
          uid,
          name: data.name,
          createdAt: Number(data.createdAt) || Date.now(),
          updatedAt: Number(data.updatedAt) || Date.now(),
          modelsCount: Number(data.modelsCount) || 0,
          appliancesCount: Number(data.appliancesCount) || 0,
          roomSummary: data.roomSummary || '',
          thumbnailDataUrl: data.thumbnailDataUrl || null,
          chunkCount: Number(data.chunkCount) || 0,
          totalBytes: Number(data.totalBytes) || 0
        });
      }
    });
    const mergedMap = new Map<string, CloudProjectSummary>();
    for (const item of cachedList) mergedMap.set(item.id, item);
    for (const item of cloudList) mergedMap.set(item.id, item);

    return Array.from(mergedMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn('Cloud list fallback to local IndexedDB cache:', err);
    return cachedList.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

const CHUNK_CHAR_SIZE = 650_000;

export async function saveUserCloudProject(
  uid: string,
  projectName: string,
  workspacePayload: any,
  options?: {
    existingProjectId?: string | null;
    thumbnailDataUrl?: string | null;
    onProgress?: (percent: number, label: string) => void;
  }
): Promise<CloudProjectSummary> {
  if (!uid) throw new Error('Trebuie să fii autentificat pentru a salva proiecte în profil.');
  const cleanName = (projectName || 'Proiect Mobilier 3D').trim();
  const projectId =
    options?.existingProjectId ||
    `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  options?.onProgress?.(5, 'Se pregătește arhiva proiectului 3D...');

  const payloadWithMeta = {
    ...workspacePayload,
    cloudProjectId: projectId,
    cloudProjectName: cleanName,
    savedAt: Date.now()
  };

  const payloadJson = JSON.stringify(payloadWithMeta);
  const totalBytes = payloadJson.length;
  const chunks: string[] = [];
  for (let offset = 0; offset < payloadJson.length; offset += CHUNK_CHAR_SIZE) {
    chunks.push(payloadJson.slice(offset, offset + CHUNK_CHAR_SIZE));
  }

  const rc = workspacePayload?.roomConfig;
  const roomSummary = rc
    ? `${rc.width || rc.widthCm || 400} × ${rc.depth || rc.lengthCm || 300} × ${rc.height || rc.heightCm || 260} cm`
    : 'Scenă 3D CAD';

  const now = Date.now();
  const summary: CloudProjectSummary = {
    id: projectId,
    uid,
    name: cleanName,
    createdAt: now,
    updatedAt: now,
    modelsCount: Array.isArray(workspacePayload?.importedModels)
      ? workspacePayload.importedModels.length
      : 0,
    appliancesCount: Array.isArray(workspacePayload?.appliances)
      ? workspacePayload.appliances.length
      : 0,
    roomSummary,
    thumbnailDataUrl: options?.thumbnailDataUrl || null,
    chunkCount: chunks.length,
    totalBytes
  };

  await cacheProjectLocally(uid, summary, payloadJson);

  options?.onProgress?.(20, `Se încarcă în Cloud (${chunks.length} pachete)...`);

  const BATCH_SIZE = 4;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((chunkStr, idx) => {
        const chunkIndex = i + idx;
        const chunkId = `chunk_${String(chunkIndex).padStart(4, '0')}`;
        const chunkRef = doc(db, 'users', uid, 'projects', projectId, 'chunks', chunkId);
        return setDoc(chunkRef, {
          index: chunkIndex,
          data: chunkStr
        });
      })
    );
    const pct = Math.min(92, Math.round(20 + ((i + batch.length) / Math.max(1, chunks.length)) * 72));
    options?.onProgress?.(pct, `Sincronizare Cloud: ${pct}%`);
  }

  const projectRef = doc(db, 'users', uid, 'projects', projectId);
  await setDoc(projectRef, summary, { merge: true });

  setActiveCloudProjectMeta({ id: projectId, name: cleanName });
  options?.onProgress?.(100, 'Proiect salvat cu succes în Cloud!');

  return summary;
}

export async function loadUserCloudProject(
  uid: string,
  projectId: string,
  onProgress?: (percent: number, label: string) => void
): Promise<{ summary: CloudProjectSummary; payload: any }> {
  if (!uid || !projectId) {
    throw new Error('ID proiect invalid.');
  }

  onProgress?.(10, 'Se verifică versiunea din Cloud...');

  const projectRef = doc(db, 'users', uid, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    const cachedJson = await getCachedProjectPayload(uid, projectId);
    if (cachedJson) {
      const payload = JSON.parse(cachedJson);
      const summary: CloudProjectSummary = {
        id: projectId,
        uid,
        name: payload.cloudProjectName || 'Proiect 3D',
        createdAt: payload.savedAt || Date.now(),
        updatedAt: payload.savedAt || Date.now(),
        modelsCount: Array.isArray(payload.importedModels) ? payload.importedModels.length : 0,
        appliancesCount: Array.isArray(payload.appliances) ? payload.appliances.length : 0,
        roomSummary: '',
        thumbnailDataUrl: null,
        chunkCount: 1,
        totalBytes: cachedJson.length
      };
      setActiveCloudProjectMeta({ id: summary.id, name: summary.name });
      onProgress?.(100, 'Proiect încărcat!');
      return { summary, payload };
    }
    throw new Error('Proiectul nu a putut fi găsit în Cloud.');
  }

  const data = projectSnap.data();
  const summary: CloudProjectSummary = {
    id: projectSnap.id,
    uid,
    name: data.name || 'Proiect 3D',
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
    modelsCount: Number(data.modelsCount) || 0,
    appliancesCount: Number(data.appliancesCount) || 0,
    roomSummary: data.roomSummary || '',
    thumbnailDataUrl: data.thumbnailDataUrl || null,
    chunkCount: Number(data.chunkCount) || 0,
    totalBytes: Number(data.totalBytes) || 0
  };

  onProgress?.(35, `Se descarcă modelul 3D din Cloud (${summary.chunkCount} pachete)...`);

  const chunksCol = collection(db, 'users', uid, 'projects', projectId, 'chunks');
  const chunksSnap = await getDocs(chunksCol);

  const orderedChunks: { index: number; data: string }[] = [];
  chunksSnap.forEach((cDoc) => {
    const cData = cDoc.data();
    if (typeof cData.data === 'string') {
      orderedChunks.push({
        index: Number(cData.index) || 0,
        data: cData.data
      });
    }
  });

  orderedChunks.sort((a, b) => a.index - b.index);
  const fullJson = orderedChunks.map((c) => c.data).join('');

  if (!fullJson) {
    const cachedJson = await getCachedProjectPayload(uid, projectId);
    if (cachedJson) {
      const payload = JSON.parse(cachedJson);
      setActiveCloudProjectMeta({ id: summary.id, name: summary.name });
      onProgress?.(100, 'Proiect încărcat!');
      return { summary, payload };
    }
    throw new Error('Datele proiectului sunt goale sau incomplete.');
  }

  onProgress?.(85, 'Se reconstruiește scena 3D CAD...');
  const payload = JSON.parse(fullJson);
  await cacheProjectLocally(uid, summary, fullJson);
  setActiveCloudProjectMeta({ id: summary.id, name: summary.name });
  onProgress?.(100, 'Proiect încărcat cu succes!');

  return { summary, payload };
}

export async function renameUserCloudProject(
  uid: string,
  projectId: string,
  newName: string
): Promise<void> {
  const clean = newName.trim();
  if (!uid || !projectId || !clean) return;
  const projectRef = doc(db, 'users', uid, 'projects', projectId);
  await setDoc(
    projectRef,
    {
      name: clean,
      updatedAt: Date.now()
    },
    { merge: true }
  );
  const active = getActiveCloudProjectMeta();
  if (active && active.id === projectId) {
    setActiveCloudProjectMeta({ id: projectId, name: clean });
  }
}

export async function deleteUserCloudProject(uid: string, projectId: string): Promise<void> {
  if (!uid || !projectId) return;
  await deleteCachedProjectLocally(uid, projectId);
  try {
    const chunksCol = collection(db, 'users', uid, 'projects', projectId, 'chunks');
    const chunksSnap = await getDocs(chunksCol);
    const deletePromises: Promise<void>[] = [];
    chunksSnap.forEach((cDoc) => {
      deletePromises.push(deleteDoc(cDoc.ref));
    });
    await Promise.all(deletePromises);
    await deleteDoc(doc(db, 'users', uid, 'projects', projectId));
  } catch (err) {
    console.warn('Delete cloud project warning:', err);
  }
  const active = getActiveCloudProjectMeta();
  if (active && active.id === projectId) {
    setActiveCloudProjectMeta(null);
  }
}
