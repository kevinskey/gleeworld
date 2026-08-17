// Offline vault for My Music: PDFs saved to THIS DEVICE so they open with
// no network and no sign-in (/my-music). Raw IndexedDB on purpose — the
// repo bans service-worker caching (public/sw.js is a self-uninstall stub)
// and avoids wrapper libs (see exportRender.ts, fontPathCache.ts).
//
// Two stores keyed by gw_personal_scores.id:
//   files    — { blob }                 (the PDF bytes)
//   manifest — VaultEntry               (list/render metadata)
// listVault() only reports entries whose blob is actually present, and
// prunes manifest orphans — "Saved" must never lie about offline readiness.
import type { PersonalScore } from '@/hooks/usePersonalScores';

const DB_NAME = 'gw-offline-vault';
const DB_VERSION = 1;
const FILES = 'files';
const MANIFEST = 'manifest';

export interface VaultEntry {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  source: PersonalScore['source'];
  size: number;
  savedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function isVaultSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openVaultDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      if (!db.objectStoreNames.contains(MANIFEST)) db.createObjectStore(MANIFEST);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

function tx<T>(storeNames: string[], mode: IDBTransactionMode, run: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T> {
  return openVaultDb().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    let out: IDBRequest<T> | void;
    t.oncomplete = () => resolve(out ? (out as IDBRequest<T>).result : (undefined as T));
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
    out = run(t);
  }));
}

export async function saveToVault(score: PersonalScore, blob: Blob): Promise<void> {
  const entry: VaultEntry = {
    id: score.id,
    title: score.title,
    composer: score.composer,
    voicing: score.voicing,
    source: score.source,
    size: blob.size,
    savedAt: new Date().toISOString(),
  };
  await tx([FILES, MANIFEST], 'readwrite', (t) => {
    t.objectStore(FILES).put({ blob }, score.id);
    t.objectStore(MANIFEST).put(entry, score.id);
  });
}

export async function removeFromVault(id: string): Promise<void> {
  await tx([FILES, MANIFEST], 'readwrite', (t) => {
    t.objectStore(FILES).delete(id);
    t.objectStore(MANIFEST).delete(id);
  });
}

export async function getVaultBlob(id: string): Promise<Blob | null> {
  const rec = await tx<{ blob: Blob } | undefined>([FILES], 'readonly', (t) => t.objectStore(FILES).get(id));
  return rec?.blob ?? null;
}

export async function listVault(): Promise<VaultEntry[]> {
  if (!isVaultSupported()) return [];
  const entries = await tx<VaultEntry[]>([MANIFEST], 'readonly', (t) => t.objectStore(MANIFEST).getAll());
  const fileKeys = await tx<IDBValidKey[]>([FILES], 'readonly', (t) => t.objectStore(FILES).getAllKeys());
  const present = new Set(fileKeys.map(String));
  const ok: VaultEntry[] = [];
  const orphans: string[] = [];
  for (const e of entries) {
    if (present.has(e.id)) {
      ok.push(e);
    } else {
      orphans.push(e.id);
    }
  }
  for (const id of orphans) await removeFromVault(id);
  return ok.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function vaultUsage(): Promise<{ count: number; bytes: number }> {
  const entries = await listVault();
  return { count: entries.length, bytes: entries.reduce((n, e) => n + e.size, 0) };
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* best-effort */ }
  return false;
}
