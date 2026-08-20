// Client half of collaborative editing.
//
// Off unless VITE_COLLAB_URL is set. That gate is the whole reason this can
// ship before the server exists: with no URL configured, `useCollaboration`
// returns nulls, DocumentEditor builds exactly the extension list it built
// before, and autosave behaves exactly as it did. Nothing about the current
// single-user path changes until the server is deployed and the env var is
// set at build time.
//
// See docs/design/2026-08-20-documents-realtime-collaboration.md.
import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { supabase } from '@/integrations/supabase/client';

export type CollabStatus = 'off' | 'connecting' | 'connected' | 'disconnected';

export interface CollabPeer {
  clientId: number;
  name: string;
  color: string;
}

export interface Collaboration {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  status: CollabStatus;
  peers: CollabPeer[];
}

/** Configured at build time; absent in every build until the server ships. */
export const COLLAB_URL: string | undefined =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_COLLAB_URL || undefined;

export function collaborationEnabled(): boolean {
  return typeof COLLAB_URL === 'string' && COLLAB_URL.length > 0;
}

/** Stable, readable cursor colour per user — same input, same colour on every
 *  peer's screen, so "the green cursor" means the same person to everyone. */
export function colorForUser(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  // Fixed S/L keeps every colour legible on the page's white paper.
  return `hsl(${Math.abs(hash) % 360} 70% 45%)`;
}

/**
 * Connect one document to the collaboration server.
 *
 * `docId` null (or collaboration disabled) is a no-op that returns the same
 * shape, so callers don't branch.
 */
export function useCollaboration(docId: string | null, displayName: string | null): Collaboration {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<CollabStatus>(collaborationEnabled() ? 'connecting' : 'off');
  const [peers, setPeers] = useState<CollabPeer[]>([]);

  // One Y.Doc per document id, for the lifetime of that id. Recreating it
  // would drop local state and re-seed from the server mid-session.
  const ydoc = useMemo(() => (docId && collaborationEnabled() ? new Y.Doc() : null), [docId]);

  useEffect(() => {
    if (!docId || !ydoc || !collaborationEnabled()) return;
    let disposed = false;
    let instance: HocuspocusProvider | null = null;

    void (async () => {
      // The access token is the credential the server verifies — it is NOT a
      // formality. Fetch it fresh rather than caching: a stale token means a
      // rejected socket and no editing.
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || disposed) return;

      instance = new HocuspocusProvider({
        url: COLLAB_URL as string,
        name: docId,
        document: ydoc,
        token,
        onStatus: ({ status: next }) => {
          if (!disposed) setStatus(next === 'connected' ? 'connected' : 'disconnected');
        },
        onAuthenticationFailed: () => {
          // Expired token or a share that was revoked mid-session. Do not
          // retry in a loop — that hammers the server with a credential that
          // is not going to start working.
          if (!disposed) setStatus('disconnected');
          instance?.disconnect();
        },
      });

      instance.setAwarenessField('user', {
        name: displayName || 'Someone',
        color: colorForUser(displayName || 'anon'),
      });

      instance.on('awarenessChange', ({ states }: { states: { clientId: number; user?: CollabPeer }[] }) => {
        if (disposed) return;
        setPeers(
          states
            .filter((s) => s.user && s.clientId !== instance?.document.clientID)
            .map((s) => ({ clientId: s.clientId, name: s.user!.name, color: s.user!.color })),
        );
      });

      if (!disposed) setProvider(instance);
    })();

    return () => {
      disposed = true;
      instance?.destroy();
      setProvider(null);
    };
  }, [docId, ydoc, displayName]);

  useEffect(() => () => { ydoc?.destroy(); }, [ydoc]);

  return { ydoc, provider, status, peers };
}
