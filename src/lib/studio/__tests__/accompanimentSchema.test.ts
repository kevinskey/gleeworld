import { describe, it, expect } from 'vitest';
import { type Session, type Accompaniment } from '@/lib/studio/session';
import { validateSession as runValidate } from '@/lib/studio/validate';
import { blankSession } from '@/lib/studio/defaults';

// validateSession returns { ok: true; session } | { ok: false; errors }
// Normalize to errors array for test assertions.
function errorsOf(result: { ok: boolean; errors?: string[]; session?: any }): string[] {
  return !result.ok && result.errors ? result.errors : [];
}

function fresh(): Session {
  return blankSession({
    id: 's1',
    ownerUserId: 'u1',
    tenantId: 't1',
    title: 'Test',
  });
}

describe('accompaniment schema', () => {
  it('defaults accompaniment and scoreId to null on a blank session', () => {
    const s = fresh();
    expect(s.accompaniment ?? null).toBeNull();
    expect(s.scoreId ?? null).toBeNull();
    expect(errorsOf(runValidate(s))).toEqual([]);
  });

  it('accepts a file accompaniment', () => {
    const s = fresh();
    const acc: Accompaniment = {
      kind: 'file',
      title: 'Backing.mp3',
      fileUrl: 'https://example.com/a.mp3',
    };
    s.accompaniment = acc;
    expect(errorsOf(runValidate(s))).toEqual([]);
  });

  it('accepts an apple_music accompaniment with all required fields', () => {
    const s = fresh();
    s.accompaniment = {
      kind: 'apple_music',
      title: 'Song · Artist',
      appleMusicId: '1234567',
      appleMusicStorefront: 'us',
      appleMusicArtist: 'Artist',
      appleMusicArtworkUrl: 'https://example.com/art.jpg',
    };
    expect(errorsOf(runValidate(s))).toEqual([]);
  });

  it('rejects apple_music missing appleMusicId', () => {
    const s = fresh();
    s.accompaniment = {
      kind: 'apple_music',
      title: null,
      appleMusicId: '',
      appleMusicStorefront: 'us',
      appleMusicArtist: null,
      appleMusicArtworkUrl: null,
    };
    expect(errorsOf(runValidate(s)).length).toBeGreaterThan(0);
  });

  it('accepts a youtube accompaniment', () => {
    const s = fresh();
    s.accompaniment = {
      kind: 'youtube',
      title: 'Live rehearsal',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
    };
    expect(errorsOf(runValidate(s))).toEqual([]);
  });

  it('accepts a string scoreId', () => {
    const s = fresh();
    s.scoreId = '00000000-0000-0000-0000-000000000001';
    expect(errorsOf(runValidate(s))).toEqual([]);
  });

  it('rejects a non-string scoreId', () => {
    const s = fresh();
    (s as any).scoreId = 42;
    expect(errorsOf(runValidate(s)).length).toBeGreaterThan(0);
  });

  it('stamps schema_version=2.1.0 on new sessions', () => {
    const s = fresh();
    expect(s.schema_version).toBe('2.1.0');
  });

  it('loads a legacy 1.0.0 manifest without accompaniment or scoreId as-is', () => {
    const legacy: Session = { ...fresh(), schema_version: '1.0.0' } as Session;
    delete (legacy as any).accompaniment;
    delete (legacy as any).scoreId;
    expect(errorsOf(runValidate(legacy))).toEqual([]);
  });
});
