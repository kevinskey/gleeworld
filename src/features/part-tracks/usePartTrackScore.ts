import { useCallback, useEffect, useState } from 'react';
import * as api from './api';
import type { PartTrackPart, PartTrackRender, PartTrackRights, PartTrackScore } from './types';

const ACTIVE = new Set(['queued', 'analyzing', 'rendering']);

export function usePartTrackScore(sheetMusicId: string, open: boolean) {
  const [score, setScore] = useState<PartTrackScore | null>(null);
  const [parts, setParts] = useState<PartTrackPart[]>([]);
  const [rights, setRights] = useState<PartTrackRights | null>(null);
  const [renders, setRenders] = useState<PartTrackRender[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const s = await api.getScoreForSheetMusic(sheetMusicId);
    setScore(s);
    if (s) {
      const [p, r, rd] = await Promise.all([
        api.listParts(s.id),
        api.getRights(s.id),
        api.listRenders(s.id),
      ]);
      setParts(p);
      setRights(r);
      setRenders(rd);
    } else {
      setParts([]);
      setRights(null);
      setRenders([]);
    }
  }, [sheetMusicId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !score || !ACTIVE.has(score.status)) return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [open, score, refresh]);

  return { score, parts, rights, renders, loading, refresh };
}
