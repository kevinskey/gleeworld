import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  user: { id: 'member-a' },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
// Inspect and execute the real query functions without mounting the PDF reader.
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => options }));

import { fetchViewerScores } from '../viewerAccess';
import { useSetlistScores } from '@/hooks/useViewerSetlists';
import { useAllBookmarks } from '@/hooks/useAllBookmarks';

type Query = { queryFn: () => Promise<unknown>; queryKey: unknown[] };
const allowed = { id: 'allowed', title: 'Shared score', composer: 'Composer', pdf_url: null, storage_path: 'score.pdf', storage_bucket: 'scores' };

function reply(data: unknown, error: unknown = null) {
  const query = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve) };
  for (const method of ['select', 'in', 'eq', 'order', 'limit'] as const) query[method].mockReturnValue(query);
  return query;
}

beforeEach(() => { vi.clearAllMocks(); mocks.user.id = 'member-a'; });

describe('Viewer library access', () => {
  it('resolves deep links through the sharing view and denies unshared scores', async () => {
    const query = reply([]);
    mocks.from.mockReturnValue(query);
    expect(await fetchViewerScores(['private'])).toEqual([]);
    expect(mocks.from).toHaveBeenCalledWith('gw_sheet_music_browse');
    expect(query.in).toHaveBeenCalledWith('id', ['private']);
  });

  it('fails closed on a sharing-query error', async () => {
    const error = new Error('Access lookup failed');
    mocks.from.mockReturnValue(reply(null, error));
    await expect(fetchViewerScores(['private'])).rejects.toThrow(error);
  });

  it('does not query the whole library for an empty setlist', async () => {
    expect(await fetchViewerScores([])).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('omits unshared setlist scores while preserving order and storage-backed PDFs', async () => {
    mocks.from.mockImplementation((table: string) => reply(table === 'gw_setlist_items' ? [
      { id: 'item-1', music_id: 'private', order_index: 0 },
      { id: 'item-2', music_id: 'allowed', order_index: 1 },
    ] : [allowed]));
    const query = useSetlistScores('setlist') as unknown as Query;
    expect(await query.queryFn()).toEqual([{
      id: 'item-2', sheet_music_id: 'allowed', order_index: 1,
      title: allowed.title, composer: allowed.composer, pdf_url: null,
      storage_path: allowed.storage_path, storage_bucket: allowed.storage_bucket,
    }]);
  });

  it('hides bookmarks after sharing is revoked', async () => {
    mocks.from.mockImplementation((table: string) => reply(table === 'gw_sheet_music_bookmarks' ? [
      { id: 'bookmark', sheet_music_id: 'private', page_number: 1 },
    ] : []));
    const query = useAllBookmarks() as unknown as Query;
    expect(await query.queryFn()).toEqual([]);
  });

  it('isolates setlist caches when another member signs in', () => {
    const first = (useSetlistScores('setlist') as unknown as Query).queryKey;
    mocks.user.id = 'member-b';
    expect((useSetlistScores('setlist') as unknown as Query).queryKey).not.toEqual(first);
  });
});
