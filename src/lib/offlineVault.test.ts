// @vitest-environment jsdom
import '../../vitest.fake-idb';
import { describe, it, expect, beforeEach } from 'vitest';
import { saveToVault, removeFromVault, listVault, getVaultBlob, vaultUsage, isVaultSupported } from './offlineVault';
import type { PersonalScore } from '@/hooks/usePersonalScores';

const score = (over: Partial<PersonalScore> = {}): PersonalScore => ({
  id: 's1', user_id: 'u1', title: 'Ave Verum', composer: 'Byrd', voicing: 'SATB',
  source: 'upload', pd_work_id: null, entitlement_id: null,
  storage_path: 'u1/uploads/x.pdf', thumbnail_path: null, ext_catalog_item_id: null,
  external_url: null, tags: [], is_favorite: false, created_at: '2026-08-17T00:00:00Z',
  ...over,
});

beforeEach(async () => {
  for (const e of await listVault()) await removeFromVault(e.id);
});

describe('offlineVault', () => {
  it('is supported under fake-indexeddb', () => {
    expect(isVaultSupported()).toBe(true);
  });

  it('round-trips a score blob', async () => {
    const blob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
    await saveToVault(score(), blob);
    const entries = await listVault();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: 's1', title: 'Ave Verum', source: 'upload' });
    const back = await getVaultBlob('s1');
    expect(back).not.toBeNull();
    expect(await back!.text()).toBe('%PDF-fake');
  });

  it('reports usage and removes cleanly', async () => {
    await saveToVault(score(), new Blob(['12345']));
    const { count, bytes } = await vaultUsage();
    expect(count).toBe(1);
    expect(bytes).toBeGreaterThan(0);
    await removeFromVault('s1');
    expect(await listVault()).toHaveLength(0);
    expect(await getVaultBlob('s1')).toBeNull();
  });

  it('prunes manifest entries whose blob is missing', async () => {
    await saveToVault(score(), new Blob(['x']));
    // simulate a partially-evicted vault: delete the blob record directly
    const req = indexedDB.open('gw-offline-vault');
    const db: IDBDatabase = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').delete('s1');
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
    expect(await listVault()).toHaveLength(0); // manifest orphan pruned, not shown
  });
});
