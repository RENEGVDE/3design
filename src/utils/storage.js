const DB_NAME = 'Bucatarie3DConfiguratorDB_v1';
const DB_STORE = 'workspace_store';
const DB_KEY = 'saved_workspace';
const LS_KEY = 'bucatarie_3d_workspace_v1';

function openConfigDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('No IndexedDB'));
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function writePersistedData(dataObj) {
  try {
    const db = await openConfigDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(dataObj, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback to localStorage:', err);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LS_KEY, JSON.stringify(dataObj));
    }
  } catch (e) {
    // Ignore localStorage quota errors since IndexedDB stores large textures & .glb binaries
  }
}

export async function readPersistedData() {
  try {
    const db = await openConfigDB();
    const res = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
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
