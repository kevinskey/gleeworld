// Live page-turn sync across nearby devices (forScore "Cue").
//
// One device leads, broadcasting its current score + page on a 6-char
// session code. Other devices subscribe and follow — the leader turns a
// page, every follower's screen turns with it. Built on Supabase Realtime
// channel broadcast (no DB rows; ephemeral). When the leader navigates to
// a different score the follower auto-routes to that score's reader.
//
// Session code is short and case-insensitive so a conductor can read it
// out loud to the section. Sessions persist as long as the leader's
// channel stays subscribed; closing the tab drops everyone.

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type CueRole = 'leader' | 'follower' | null;

export interface CuePageMessage {
  scoreId: string;
  page: number;
  timestamp: number;
  leaderName?: string;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // skip 0/O/1/I for clarity
function generateCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

interface UseCueCoordinationArgs {
  scoreId: string;
  currentPage: number;
  onRemotePage?: (msg: CuePageMessage) => void;
}

export function useCueCoordination({ scoreId, currentPage, onRemotePage }: UseCueCoordinationArgs) {
  const { user } = useAuth();
  const [role, setRole] = useState<CueRole>(null);
  const [code, setCode] = useState<string | null>(null);
  const [participants, setParticipants] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const onRemoteRef = useRef(onRemotePage);
  useEffect(() => { onRemoteRef.current = onRemotePage; }, [onRemotePage]);

  const teardown = useCallback(() => {
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    setRole(null);
    setCode(null);
    setParticipants(0);
  }, []);

  // Leader: open channel + presence under our display name so followers
  // see who's leading. We never need to receive page broadcasts since we
  // ARE the source of truth.
  const startLeading = useCallback(async () => {
    teardown();
    const newCode = generateCode();
    setLastError(null);
    const ch = supabase.channel(`cue:${newCode}`, {
      config: { broadcast: { ack: false, self: false }, presence: { key: user?.id ?? 'anon' } },
    });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      setParticipants(Object.keys(state).length);
    });
    await new Promise<void>((resolve, reject) => {
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ role: 'leader', name: (user as any)?.user_metadata?.name ?? user?.email ?? 'Leader' });
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`channel subscribe ${status}`));
        }
      });
    }).catch((err) => { setLastError(err.message); throw err; });
    channelRef.current = ch;
    setRole('leader');
    setCode(newCode);
    // Send an initial page message so followers who join after the leader
    // gets started immediately snap to the correct page.
    ch.send({
      type: 'broadcast', event: 'page',
      payload: { scoreId, page: currentPage, timestamp: Date.now() } satisfies CuePageMessage,
    });
    return newCode;
  }, [scoreId, currentPage, user, teardown]);

  // Follower: subscribe + listen for page events. Apply via the consumer's
  // onRemotePage callback so the Viewer can decide whether to navigate
  // within the score or route to a different score entirely.
  const joinAsFollower = useCallback(async (joinCode: string) => {
    teardown();
    const norm = joinCode.trim().toUpperCase();
    if (!norm.match(/^[A-Z0-9]{4,8}$/)) { setLastError('Invalid code'); return false; }
    setLastError(null);
    const ch = supabase.channel(`cue:${norm}`, {
      config: { presence: { key: user?.id ?? 'anon' } },
    });
    ch.on('broadcast', { event: 'page' }, ({ payload }) => {
      onRemoteRef.current?.(payload as CuePageMessage);
    });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      setParticipants(Object.keys(state).length);
    });
    let ok = false;
    await new Promise<void>((resolve) => {
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ role: 'follower', name: (user as any)?.user_metadata?.name ?? user?.email ?? 'Follower' });
          ok = true;
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          resolve();
        }
      });
    });
    if (!ok) { setLastError('Could not join'); return false; }
    channelRef.current = ch;
    setRole('follower');
    setCode(norm);
    return true;
  }, [user, teardown]);

  // Whenever the leader's page changes, broadcast it. We debounce in the
  // caller (Viewer) since page changes can fire rapidly during a jump.
  useEffect(() => {
    if (role !== 'leader' || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast', event: 'page',
      payload: { scoreId, page: currentPage, timestamp: Date.now() } satisfies CuePageMessage,
    });
  }, [role, scoreId, currentPage]);

  useEffect(() => () => { teardown(); }, [teardown]);

  return {
    role, code, participants, lastError,
    startLeading, joinAsFollower, leave: teardown,
  };
}
