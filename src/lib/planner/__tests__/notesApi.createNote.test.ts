import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the insert payload; the chain mirrors createNote's
// .insert().select('*').single() shape.
const inserted: Record<string, unknown>[] = [];
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return {
          select: () => ({ single: async () => ({ data: { id: 'n1', ...row }, error: null }) }),
        };
      },
    }),
  },
}));

import { createNote } from '../notesApi';

describe('createNote properties passthrough', () => {
  beforeEach(() => { inserted.length = 0; });

  it('stores caller-supplied properties (article metadata) on the row', async () => {
    await createNote({
      title: 'Saved article',
      properties: { source_url: 'https://example.com/story', source_name: 'Example News' },
    });
    expect(inserted[0].properties).toEqual({
      source_url: 'https://example.com/story',
      source_name: 'Example News',
    });
  });

  it('leaves properties to the DB default when not supplied', async () => {
    await createNote({ title: 'Plain note' });
    expect('properties' in inserted[0]).toBe(false);
  });
});
