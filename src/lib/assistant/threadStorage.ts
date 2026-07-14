import type { ThreadMessage } from './types';

// sessionStorage mirror of the assistant thread so a reload keeps the
// conversation. Confirm cards are NOT resurrected as actionable: a
// pendingAction that never got its explicit Send must come back inert
// (state 'cancelled'), otherwise a reload could re-offer a stale SMS send.
const KEY = 'gw_assistant_thread';
const CAP = 50;

export function saveThread(messages: ThreadMessage[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-CAP)));
  } catch { /* quota / private mode — mirror is best-effort */ }
}

export function loadThread(): ThreadMessage[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m: ThreadMessage) => {
      if (!m.pendingAction && m.actionState !== 'pending') return m;
      const { pendingAction: _dropped, ...rest } = m;
      return { ...rest, actionState: m.actionState === 'pending' ? 'cancelled' as const : m.actionState };
    });
  } catch { return []; }
}
