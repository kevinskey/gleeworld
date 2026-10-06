// Shared types + localStorage watch-history helpers for the YouTube media
// panel. Kept separate from the component so the edge-function contract and
// the history persistence rules live in one obvious place.

/** {kind:'status'} response from the 'youtube-library' edge function. */
export interface YtStatus {
  connected: boolean;
  hasYouTubeScope: boolean;
}

/** One playlist row from {kind:'playlists'}. */
export interface YtPlaylist {
  id: string;
  title: string;
  thumb: string;
  count: number;
}

/** One video row from {kind:'playlistItems'} / {kind:'liked'}. */
export interface YtVideo {
  videoId: string;
  title: string;
  thumb: string;
  channel: string;
  publishedAt: string;
}

export interface YtPlaylistsResponse {
  items: YtPlaylist[];
  nextPageToken?: string;
  error?: string;
}

export interface YtVideosResponse {
  items: YtVideo[];
  nextPageToken?: string;
  error?: string;
}

/** One entry in the local watch history ('Recent' tab). */
export interface YtHistoryEntry {
  videoId: string;
  title: string;
  thumb: string;
  channel: string;
  /** ISO timestamp of when Doc hit play — newest entries sort first. */
  playedAt: string;
}

// Why localStorage and not the YouTube API: Google removed third-party access
// to account watch history years ago (watchHistory playlist returns empty for
// every OAuth app). The ONLY way to have a "Recent" surface is to record plays
// we initiate ourselves. Do not "fix" this by calling the API — it cannot work.
// Keyed PER USER (Kevin, 2026-10-06: "Each user should have their own
// youtube setting on command center") — the original single key bled one
// account's Recent tab into every other account on the same browser. No
// userId (signed-out edge, tests) falls back to the legacy shared key; no
// migration from it, because moving its entries would hand user A's history
// to user B — the exact bleed being fixed.
const HISTORY_KEY_BASE = 'gw-yt-history';
const HISTORY_CAP = 50;

const historyKey = (userId?: string | null) =>
  userId ? `${HISTORY_KEY_BASE}:${userId}` : HISTORY_KEY_BASE;

export function readYtHistory(userId?: string | null): YtHistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter rather than trust — a corrupted entry shouldn't blank the tab.
    return parsed.filter(
      (e): e is YtHistoryEntry =>
        !!e && typeof e === 'object' && typeof (e as YtHistoryEntry).videoId === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Prepend a play to history: newest first, deduped by videoId (keeping the
 * newest occurrence), capped at 50 so the key never grows unbounded.
 */
export function recordYtPlay(
  entry: Omit<YtHistoryEntry, 'playedAt'>,
  userId?: string | null,
): YtHistoryEntry[] {
  const next: YtHistoryEntry[] = [
    { ...entry, playedAt: new Date().toISOString() },
    ...readYtHistory(userId).filter((e) => e.videoId !== entry.videoId),
  ].slice(0, HISTORY_CAP);
  try {
    localStorage.setItem(historyKey(userId), JSON.stringify(next));
  } catch {
    // Quota/private-mode failures just mean history doesn't persist — the
    // play itself must never be blocked by that.
  }
  return next;
}
