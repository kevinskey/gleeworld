/**
 * Client-side reading of SoundCloud playlist shares.
 *
 * The real gate is RLS on gw_soundcloud_playlist_shares — a member's query
 * only ever returns rows that name them, so they cannot even learn the
 * titles of sets kept from them. What lives here is the presentation half:
 * turning the rows that did arrive into "which playlists does this person
 * see, and who is each one shared with".
 *
 * Kept apart from the page so the rules are testable without a DOM or a
 * Supabase round trip.
 */

export interface PlaylistShare {
  id: string;
  playlist_id: number;
  playlist_title: string | null;
  playlist_url: string;
  share_type: 'role' | 'course' | 'email';
  target_role: 'admin' | 'staff' | 'member' | null;
  course_id: string | null;
  invited_email: string | null;
  revoked_at: string | null;
}

interface HasId { id: number }

const live = (s: PlaylistShare) => !s.revoked_at;

/**
 * The playlists this viewer should see.
 *
 * Admins get everything, including sets shared with nobody — they cannot
 * administer what they cannot see. For everyone else the default is hidden:
 * no share row means the playlist is not on their page.
 *
 * Input order is preserved so the caller keeps whatever sort it chose.
 */
export function visiblePlaylists<T extends HasId>(
  playlists: T[],
  shares: PlaylistShare[],
  isAdmin: boolean,
): T[] {
  if (isAdmin) return playlists;
  const shared = new Set(shares.filter(live).map((s) => s.playlist_id));
  return playlists.filter((p) => shared.has(p.id));
}

/** Live shares grouped by playlist, for rendering "shared with" lists. */
export function sharesByPlaylist(shares: PlaylistShare[]): Map<number, PlaylistShare[]> {
  const map = new Map<number, PlaylistShare[]>();
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
  // 'member' is every signed-in member of the tenant, which reads better as
  // "Everyone" on a chip than "All members".
  member: 'Everyone',
};

/**
 * Human label for one share. Course names are passed in rather than looked
 * up here: the caller already loads the class list for its picker.
 */
export function describeShare(share: PlaylistShare, courseNames?: Record<string, string>): string {
  if (share.share_type === 'email') return share.invited_email ?? 'Someone';
  if (share.share_type === 'course') {
    return (share.course_id && courseNames?.[share.course_id]) || 'A class';
  }
  return (share.target_role && ROLE_LABELS[share.target_role]) || 'Everyone';
}
