import { describe, it, expect } from 'vitest';
import { shouldSnapshot, describeVersion, AUTO_SNAPSHOT_INTERVAL_MS } from './versionsApi';
import { orphanedComments, sortComments, type DocComment } from './commentsApi';

const NOW = 1_800_000_000_000;

describe('shouldSnapshot', () => {
  it('never snapshots a document nobody changed', () => {
    // The expensive mistake: a full copy of the body every interval for a
    // doc sitting open in a background tab.
    expect(shouldSnapshot({ now: NOW, lastSnapshotAt: NOW - 10 * AUTO_SNAPSHOT_INTERVAL_MS, dirtySinceLastSnapshot: false })).toBe(false);
  });

  it('takes the first snapshot as soon as there are edits', () => {
    // No history yet — a document should always have a floor to restore to.
    expect(shouldSnapshot({ now: NOW, lastSnapshotAt: null, dirtySinceLastSnapshot: true })).toBe(true);
  });

  it('waits out the interval between automatic snapshots', () => {
    expect(shouldSnapshot({ now: NOW, lastSnapshotAt: NOW - 1000, dirtySinceLastSnapshot: true })).toBe(false);
    expect(shouldSnapshot({
      now: NOW, lastSnapshotAt: NOW - AUTO_SNAPSHOT_INTERVAL_MS, dirtySinceLastSnapshot: true,
    })).toBe(true);
  });

  it('honours a custom interval', () => {
    expect(shouldSnapshot({ now: NOW, lastSnapshotAt: NOW - 5000, dirtySinceLastSnapshot: true, intervalMs: 1000 })).toBe(true);
  });
});

describe('describeVersion', () => {
  const base = { id: 'v1', word_count: 10, created_at: new Date(NOW).toISOString() };

  it('prefers the user’s own label', () => {
    expect(describeVersion({ ...base, label: 'Before the rewrite' }, NOW)).toBe('Before the rewrite');
  });

  it('describes automatic snapshots by age', () => {
    expect(describeVersion({ ...base, label: null }, NOW + 30_000)).toBe('Just now');
    expect(describeVersion({ ...base, label: null }, NOW + 5 * 60_000)).toBe('5 minutes ago');
    expect(describeVersion({ ...base, label: null }, NOW + 60 * 60_000)).toBe('1 hour ago');
    expect(describeVersion({ ...base, label: null }, NOW + 48 * 60 * 60_000)).toBe('2 days ago');
  });
});

function comment(over: Partial<DocComment>): DocComment {
  return {
    id: 'c1', doc_id: 'd1', user_id: 'u1', anchor_id: 'a1', body: 'text',
    resolved_at: null, resolved_by: null,
    created_at: '2026-08-19T10:00:00Z', updated_at: '2026-08-19T10:00:00Z',
    ...over,
  };
}

describe('orphanedComments', () => {
  it('finds threads whose anchor text was deleted', () => {
    const comments = [comment({ id: 'a', anchor_id: 'live' }), comment({ id: 'b', anchor_id: 'gone' })];
    const orphans = orphanedComments(comments, new Set(['live']));
    expect(orphans.map((c) => c.id)).toEqual(['b']);
  });

  it('returns nothing when every anchor is still present', () => {
    const comments = [comment({ anchor_id: 'x' })];
    expect(orphanedComments(comments, new Set(['x']))).toEqual([]);
  });
});

describe('sortComments', () => {
  it('puts open threads first, oldest first', () => {
    const out = sortComments([
      comment({ id: 'new', created_at: '2026-08-19T12:00:00Z' }),
      comment({ id: 'old', created_at: '2026-08-19T09:00:00Z' }),
    ]);
    expect(out.map((c) => c.id)).toEqual(['old', 'new']);
  });

  it('pushes resolved threads below open ones, most recently resolved first', () => {
    const out = sortComments([
      comment({ id: 'resolved-old', resolved_at: '2026-08-19T11:00:00Z' }),
      comment({ id: 'open' }),
      comment({ id: 'resolved-new', resolved_at: '2026-08-19T13:00:00Z' }),
    ]);
    expect(out.map((c) => c.id)).toEqual(['open', 'resolved-new', 'resolved-old']);
  });
});
