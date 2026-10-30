const DB_NAME = 'Bucatarie3DConfiguratorDB_v1';
const DB_STORE = 'workspace_store';
const DB_KEY = 'saved_workspace';
const LS_KEY = 'bucatarie_3d_workspace_v1';

function openConfigDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('No IndexedDB'));
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = (e: Event) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e: Event) => reject((e.target as IDBOpenDBRequest).error);
  });
}

let pendingWriteTimer: ReturnType<typeof setTimeout> | null = null;
let lastPendingData: any = null;

export async function writePersistedData(dataObj: any, immediate = false) {
  lastPendingData = dataObj;
  if (!immediate) {
    if (pendingWriteTimer) clearTimeout(pendingWriteTimer);
    pendingWriteTimer = setTimeout(() => {
      commitPersistedData(lastPendingData);
    }, 250);
    return;
  }
  if (pendingWriteTimer) {
    clearTimeout(pendingWriteTimer);
    pendingWriteTimer = null;
  }
  await commitPersistedData(dataObj);
}

async function commitPersistedData(dataObj: any) {
  if (!dataObj) return;
  try {
    const db = await openConfigDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(dataObj, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e: Event) => reject((e.target as IDBRequest).error);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback to localStorage:', err);
  }

  // Save lightweight metadata to localStorage (without multi-megabyte GLB base64 binaries)
  // to prevent freezing the main UI thread during JSON.stringify and avoid QuotaExceededError
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      let lsObj = dataObj;
      if (Array.isArray(dataObj.importedModels) && dataObj.importedModels.length > 0) {
        lsObj = {
          ...dataObj,
          importedModels: dataObj.importedModels.map((im: any) => ({
            ...im,
            b64Data: null
          }))
        };
      }
      window.localStorage.setItem(LS_KEY, JSON.stringify(lsObj));
    }
  } catch (e) {
    // Ignore localStorage quota errors
  }
}

export async function readPersistedData(): Promise<any> {
  try {
    const db = await openConfigDB();
    const res = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
    });
    if (res) return res;
  } catch (err) {
    console.warn('IndexedDB read fallback to localStorage:', err);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}
