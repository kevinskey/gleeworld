import { describe, expect, it } from 'vitest';
import { rowToSong } from '../songsApi';

const row = {
  id: 'a1b2c3d4-0000-0000-0000-000000000001',
  user_id: 'u1',
  title: 'Test',
  sections: [{ id: 's1', type: 'verse', lines: ['la la'] }],
  notes: null,
  tempo_bpm: 92,
  key_signature: 'C',
  graveyard: [],
  chord_chart: null,
  visibility: 'private',
  created_at: '2026-07-10T00:00:00Z',
  updated_at: '2026-07-10T00:00:00Z',
};

describe('rowToSong', () => {
  it('maps jsonb columns through and defaults arrays', () => {
    const song = rowToSong({ ...row, sections: null, graveyard: null } as any);
    expect(song.sections).toEqual([]);
    expect(song.graveyard).toEqual([]);
  });
  it('preserves populated fields', () => {
    const song = rowToSong(row as any);
    expect(song.tempo_bpm).toBe(92);
    expect(song.sections).toHaveLength(1);
    expect(song.visibility).toBe('private');
  });
});
