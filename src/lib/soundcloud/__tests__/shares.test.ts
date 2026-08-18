import { describe, it, expect } from 'vitest';
import { visiblePlaylists, sharesByPlaylist, describeShare, type PlaylistShare } from '../shares';

const pl = (id: number, title: string) => ({ id, title, trackCount: 3, permalinkUrl: `u/${id}` });

const share = (playlistId: number, over: Partial<PlaylistShare> = {}): PlaylistShare => ({
  id: `s${playlistId}-${over.share_type ?? 'role'}-${over.target_role ?? over.invited_email ?? over.course_id ?? ''}`,
  playlist_id: playlistId,
  playlist_title: null,
  playlist_url: `u/${playlistId}`,
  share_type: 'role',
  target_role: 'member',
  course_id: null,
  invited_email: null,
  revoked_at: null,
  ...over,
});

describe('visiblePlaylists', () => {
  const all = [pl(1, 'Practice'), pl(2, 'Private'), pl(3, 'Concert')];

  // The whole point of the default: a set nobody has shared is not on the
  // page. Admins are the exception — they cannot administer what they
  // cannot see.
  it('hides everything from a member when nothing is shared', () => {
    expect(visiblePlaylists(all, [], false)).toEqual([]);
  });

  it('shows admins every playlist even with no shares', () => {
    expect(visiblePlaylists(all, [], true)).toHaveLength(3);
  });

  it('shows a member only the playlists shared with them', () => {
    const got = visiblePlaylists(all, [share(1), share(3)], false);
    expect(got.map((p) => p.id)).toEqual([1, 3]);
  });

  // RLS already filters rows to the caller, so any row that arrives is a
  // grant — but a revoked row must never count, in case one is read through
  // an admin's unrestricted view.
  it('ignores revoked shares', () => {
    const got = visiblePlaylists(all, [share(1, { revoked_at: '2026-08-18T00:00:00Z' })], false);
    expect(got).toEqual([]);
  });

  it('counts a playlist once when it is shared several ways', () => {
    const got = visiblePlaylists(all, [
      share(1),
      share(1, { share_type: 'email', target_role: null, invited_email: 'a@b.com' }),
    ], false);
    expect(got.map((p) => p.id)).toEqual([1]);
  });

  it('ignores shares naming a playlist that no longer exists', () => {
    expect(visiblePlaylists(all, [share(99)], false)).toEqual([]);
  });

  it('preserves the incoming playlist order', () => {
    const got = visiblePlaylists(all, [share(3), share(1)], false);
    expect(got.map((p) => p.id)).toEqual([1, 3]);
  });
});

describe('sharesByPlaylist', () => {
  it('groups live shares under their playlist id', () => {
    const map = sharesByPlaylist([share(1), share(1, { target_role: 'staff' }), share(2)]);
    expect(map.get(1)).toHaveLength(2);
    expect(map.get(2)).toHaveLength(1);
  });

  it('leaves revoked shares out of the grouping', () => {
    const map = sharesByPlaylist([share(1, { revoked_at: '2026-08-18T00:00:00Z' })]);
    expect(map.get(1)).toBeUndefined();
  });
});

describe('describeShare', () => {
  it('names the role', () => {
    expect(describeShare(share(1, { target_role: 'admin' }))).toBe('All admins');
    expect(describeShare(share(1, { target_role: 'staff' }))).toBe('All staff');
    expect(describeShare(share(1, { target_role: 'member' }))).toBe('Everyone');
  });

  it('names the person for an email share', () => {
    const s = share(1, { share_type: 'email', target_role: null, invited_email: 'singer@example.com' });
    expect(describeShare(s)).toBe('singer@example.com');
  });

  it('falls back to a generic label for a class without a resolved name', () => {
    const s = share(1, { share_type: 'course', target_role: null, course_id: 'c1' });
    expect(describeShare(s)).toBe('A class');
    expect(describeShare(s, { c1: 'LH101' })).toBe('LH101');
  });
});
