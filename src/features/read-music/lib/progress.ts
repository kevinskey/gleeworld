import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BUCKET = "read-music-progress";
const FILE = "state.json";
const LS_PREFIX = "rmw:state:";

export type ProgressState = {
  // Per-tier round bests etc. Free-form to avoid coupling to specific drills.
  middle?: { bestXp?: number };
  high?: { bestAccuracy?: number; achievements?: string[] };
  college?: { bestSprint?: number; dailyStreak?: number; dailyStreakDate?: string };
  updatedAt?: string;
  [k: string]: unknown;
};

function lsKey(userId: string) {
  return `${LS_PREFIX}${userId}`;
}

function readLocal(userId: string): ProgressState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(lsKey(userId));
    return raw ? (JSON.parse(raw) as ProgressState) : null;
  } catch { return null; }
}

function writeLocal(userId: string, s: ProgressState) {
  try { localStorage.setItem(lsKey(userId), JSON.stringify(s)); } catch { /* ignore quota */ }
}

async function readRemote(userId: string): Promise<ProgressState | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(`${userId}/${FILE}`);
  if (error || !data) return null;
  try {
    const txt = await data.text();
    return JSON.parse(txt) as ProgressState;
  } catch { return null; }
}

async function writeRemote(userId: string, s: ProgressState): Promise<boolean> {
  const blob = new Blob([JSON.stringify(s)], { type: "application/json" });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`${userId}/${FILE}`, blob, { upsert: true, contentType: "application/json" });
  return !error;
}

export function useReadMusicProgress() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<ProgressState>({});
  const [synced, setSynced] = useState(false);
  const pendingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    const local = readLocal(userId) ?? {};
    setState(local);
    void (async () => {
      const remote = await readRemote(userId);
      if (remote) {
        // remote wins on initial sync (most recent updatedAt wins if both exist)
        const merged = (remote.updatedAt ?? "") >= (local.updatedAt ?? "") ? remote : local;
        setState(merged);
        writeLocal(userId, merged);
      }
      setSynced(true);
    })();
  }, [userId]);

  const update = useCallback((patch: ProgressState) => {
    if (!userId) return;
    setState((prev) => {
      const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      writeLocal(userId, next);
      if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
      pendingTimer.current = window.setTimeout(() => { void writeRemote(userId, next); }, 1500);
      return next;
    });
  }, [userId]);

  return { state, synced, update, userId };
}
