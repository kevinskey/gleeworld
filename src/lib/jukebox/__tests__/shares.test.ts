import { describe, it, expect } from 'vitest';
import {
  visiblePlaylists, sharesByPlaylist, describeShare, formatDuration, type JukeboxShare,
} from '../shares';

// Port of the SoundCloud shares tests (deleted with that page, 2026-10-05)
// to the Jukebox's uuid playlist ids. The rules are identical on purpose.

const pl = (id: string, title: string) => ({ id, title });

const share = (playlistId: string, over: Partial<JukeboxShare> = {}): JukeboxShare => ({
  id: `s-${playlistId}-${over.share_type ?? 'role'}-${over.target_role ?? over.invited_email ?? over.course_id ?? ''}`,
  playlist_id: playlistId,
  playlist_title: null,
  share_type: 'role',
  target_role: 'member',
  course_id: null,
  invited_email: null,
  revoked_at: null,
  ...over,
});

describe('visiblePlaylists', () => {
  const all = [pl('p1', 'Practice'), pl('p2', 'Private'), pl('p3', 'Concert')];

  // The whole point of the default: a playlist nobody has shared is not on
  // the page. Admins are the exception — they cannot administer what they
  // cannot see.
  it('hides everything from a member when nothing is shared', () => {
    expect(visiblePlaylists(all, [], false)).toEqual([]);
  });

  it('shows admins every playlist even with no shares', () => {
    expect(visiblePlaylists(all, [], true)).toHaveLength(3);
  });

  it('shows a member only the playlists shared with them', () => {
    const got = visiblePlaylists(all, [share('p1'), share('p3')], false);
    expect(got.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  // RLS already filters rows to the caller, so any row that arrives is a
  // grant — but a revoked row must never count, in case one is read through
  // an admin's unrestricted view.
  it('ignores revoked shares', () => {
    const got = visiblePlaylists(all, [share('p1', { revoked_at: '2026-10-05T00:00:00Z' })], false);
    expect(got).toEqual([]);
  });

  it('counts a playlist once when it is shared several ways', () => {
    const got = visiblePlaylists(all, [
      share('p1'),
      share('p1', { share_type: 'email', target_role: null, invited_email: 'a@b.com' }),
    ], false);
    expect(got.map((p) => p.id)).toEqual(['p1']);
  });

  it('ignores shares naming a playlist that no longer exists', () => {
    expect(visiblePlaylists(all, [share('p99')], false)).toEqual([]);
  });

  it('preserves the incoming playlist order', () => {
    const got = visiblePlaylists(all, [share('p3'), share('p1')], false);
    expect(got.map((p) => p.id)).toEqual(['p1', 'p3']);
  });
});

describe('sharesByPlaylist', () => {
  it('groups live shares under their playlist id', () => {
    const map = sharesByPlaylist([share('p1'), share('p1', { target_role: 'staff' }), share('p2')]);
    expect(map.get('p1')).toHaveLength(2);
    expect(map.get('p2')).toHaveLength(1);
  });

  it('leaves revoked shares out of the grouping', () => {
    const map = sharesByPlaylist([share('p1', { revoked_at: '2026-10-05T00:00:00Z' })]);
    expect(map.get('p1')).toBeUndefined();
  });
});

describe('describeShare', () => {
  it('names the role', () => {
    expect(describeShare(share('p1', { target_role: 'admin' }))).toBe('All admins');
    expect(describeShare(share('p1', { target_role: 'staff' }))).toBe('All staff');
    expect(describeShare(share('p1', { target_role: 'member' }))).toBe('Everyone');
  });

  it('names the person for an email share', () => {
    const s = share('p1', { share_type: 'email', target_role: null, invited_email: 'singer@example.com' });
    expect(describeShare(s)).toBe('singer@example.com');
  });

  it('falls back to a generic label for a class without a resolved name', () => {
    const s = share('p1', { share_type: 'course', target_role: null, course_id: 'c1' });
    expect(describeShare(s)).toBe('A class');
    expect(describeShare(s, { c1: 'LH101' })).toBe('LH101');
  });
});

describe('formatDuration', () => {
  it('renders m:ss and h:mm:ss', () => {
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });

  it('renders nothing for missing or broken lengths', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(Number.NaN)).toBe('');
  });
});
