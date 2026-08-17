// Bridges the raw IndexedDB vault (src/lib/offlineVault.ts) to My Music's
// UI: tracks which scores are saved for offline use, drives the
// save/remove buttons, and surfaces total usage. React-query caches the
// vault listing (invalidated on every save/remove) so multiple cards/rows
// share one read instead of hitting IndexedDB per item.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSignedUrl } from '@/utils/storage';
import { PERSONAL_SCORES_BUCKET } from '@/lib/personalLibrary';
import { isVaultSupported, listVault, saveToVault, removeFromVault, requestPersistence } from '@/lib/offlineVault';
import type { PersonalScore } from '@/hooks/usePersonalScores';

export function useOfflineVault() {
  const supported = isVaultSupported();
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: entries = [] } = useQuery({
    queryKey: ['offline-vault'],
    queryFn: listVault,
    enabled: supported,
    staleTime: 30_000,
  });

  const saveScore = async (score: PersonalScore) => {
    if (!score.storage_path) { toast.error(`"${score.title}" has no file to save.`); return; }
    setSaving(score.id);
    try {
      const url = await getSignedUrl(PERSONAL_SCORES_BUCKET, score.storage_path, 3600, false);
      if (!url) throw new Error('could not sign the file URL');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      await saveToVault(score, await res.blob());
      await requestPersistence();
      qc.invalidateQueries({ queryKey: ['offline-vault'] });
      toast.success('Saved to this device', { description: `"${score.title}" opens offline at /my-music.` });
    } catch (e: unknown) {
      toast.error('Could not save to this device', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(null);
    }
  };

  const removeScore = async (id: string) => {
    await removeFromVault(id);
    qc.invalidateQueries({ queryKey: ['offline-vault'] });
  };

  return {
    supported,
    savedIds: new Set(entries.map((e) => e.id)),
    usage: { count: entries.length, bytes: entries.reduce((n, e) => n + e.size, 0) },
    saving,
    saveScore,
    removeScore,
  };
}
