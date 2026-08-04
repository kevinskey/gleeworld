import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert: (...a: unknown[]) => insertMock(...a) }) },
}));

import { addVideoToLibrary } from './videoLibrary';
import { youTubeSource } from './videoSources';

// insert(...).select() is the shape the real client returns.
const resolving = (value: unknown) => ({ select: () => Promise.resolve(value) });

beforeEach(() => insertMock.mockReset());

describe('addVideoToLibrary', () => {
  it('reports added when a row comes back', async () => {
    insertMock.mockReturnValue(resolving({ data: [{ id: 'row-1' }], error: null }));
    const result = await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(result).toEqual({ outcome: 'added' });
  });

  it('sends channel_id as null so the UUID FK accepts the row', async () => {
    insertMock.mockReturnValue(resolving({ data: [{ id: 'row-1' }], error: null }));
    await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        video_id: 'abc123',
        channel_id: null,
        title: 'Hallelujah',
        video_url: 'https://www.youtube.com/watch?v=abc123',
      }),
    );
  });

  it('falls back to the video id when no title is provided', async () => {
    insertMock.mockReturnValue(resolving({ data: [{ id: 'row-1' }], error: null }));
    await addVideoToLibrary(youTubeSource('abc123'), '');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'abc123' }));
  });

  it('maps a 23505 unique violation to duplicate rather than throwing', async () => {
    insertMock.mockReturnValue(resolving({ data: null, error: { code: '23505', message: 'dupe' } }));
    const result = await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(result).toEqual({ outcome: 'duplicate' });
  });

  it('reports failed with the message on any other error', async () => {
    insertMock.mockReturnValue(resolving({ data: null, error: { code: '42501', message: 'denied' } }));
    const result = await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(result).toEqual({ outcome: 'failed', message: 'denied' });
  });

  it('treats an empty row set as failed — RLS silently returns no rows', async () => {
    insertMock.mockReturnValue(resolving({ data: [], error: null }));
    const result = await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(result.outcome).toBe('failed');
    expect(result.message).toMatch(/permission/i);
  });
});
