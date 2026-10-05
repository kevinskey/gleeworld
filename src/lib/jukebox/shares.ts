/**
 * Client-side reading of Jukebox playlist shares.
 *
 * Port of src/lib/soundcloud/shares.ts to the Jukebox's uuid playlist ids.
 * The real gate is RLS on gw_jukebox_playlist_shares — a member's query only
 * ever returns rows that name them, so they cannot even learn the titles of
 * playlists kept from them. What lives here is the presentation half.
 */

export interface JukeboxShare {
  id: string;
  playlist_id: string;
  playlist_title: string | null;
  share_type: 'role' | 'course' | 'email';
  target_role: 'admin' | 'staff' | 'member' | null;
  course_id: string | null;
  invited_email: string | null;
  revoked_at: string | null;
}

interface HasId { id: string }

const live = (s: JukeboxShare) => !s.revoked_at;

/**
 * The playlists this viewer should see. Admins get everything, including
 * playlists shared with nobody — they cannot administer what they cannot
 * see. For everyone else the default is hidden. (RLS already enforces this
 * server-side; this keeps an admin's full list ordered for members too.)
 */
export function visiblePlaylists<T extends HasId>(
  playlists: T[],
  shares: JukeboxShare[],
  isAdmin: boolean,
): T[] {
  if (isAdmin) return playlists;
  const shared = new Set(shares.filter(live).map((s) => s.playlist_id));
  return playlists.filter((p) => shared.has(p.id));
}

/** Live shares grouped by playlist, for rendering "shared with" lists. */
export function sharesByPlaylist(shares: JukeboxShare[]): Map<string, JukeboxShare[]> {
  const map = new Map<string, JukeboxShare[]>();
  for (const s of shares) {
    if (!live(s)) continue;
    const list = map.get(s.playlist_id);
    if (list) list.push(s);
    else map.set(s.playlist_id, [s]);
  }
  return map;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'All admins',
  staff: 'All staff',
  member: 'Everyone',
};

/** Human label for one share. Course names are passed in rather than looked
 *  up here: the caller already loads the class list for its picker. */
export function describeShare(share: JukeboxShare, courseNames?: Record<string, string>): string {
  if (share.share_type === 'email') return share.invited_email ?? 'Someone';
  if (share.share_type === 'course') {
    return (share.course_id && courseNames?.[share.course_id]) || 'A class';
  }
  return (share.target_role && ROLE_LABELS[share.target_role]) || 'Everyone';
}

/** m:ss (or h:mm:ss) for a track length in milliseconds. */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}
