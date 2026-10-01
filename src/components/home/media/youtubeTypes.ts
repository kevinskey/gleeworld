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
const HISTORY_KEY = 'gw-yt-history';
const HISTORY_CAP = 50;

export function readYtHistory(): YtHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
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
export function recordYtPlay(entry: Omit<YtHistoryEntry, 'playedAt'>): YtHistoryEntry[] {
  const next: YtHistoryEntry[] = [
    { ...entry, playedAt: new Date().toISOString() },
    ...readYtHistory().filter((e) => e.videoId !== entry.videoId),
  ].slice(0, HISTORY_CAP);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Quota/private-mode failures just mean history doesn't persist — the
    // play itself must never be blocked by that.
  }
  return next;
}
