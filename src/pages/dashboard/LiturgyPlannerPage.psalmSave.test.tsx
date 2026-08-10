// @vitest-environment jsdom
//
// psalmImageUrl used to be written onto worship_aid alongside psalmScoreId
// every time the psalm composer saved — even though the worship aid has
// engraved from the stored MusicXML at build time since #590, and the id
// alone is what lets that engraving happen again. The picture was accumulating
// on every save for no reader left to look at it.
//
// This file is about the WRITE only, at the moment of save. The read-side
// fallback — an aid whose Mass has a psalmImageUrl but no score at all —
// is covered in WorshipAidPage.psalm.test.tsx and is untouched here.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

afterEach(cleanup);

// vi.mock factories hoist above the imports, so the mutable row the stub
// serves has to be hoisted with them.
const h = vi.hoisted(() => ({
  massRow: {} as Record<string, unknown>,
  updates: [] as Array<Record<string, unknown>>,
  /** Set by a test to drive PsalmComposerDialog's onSaved as if the
   *  composer had just saved a setting to the library. */
  onSavedArgs: null as [string, string, string | null] | null,
}));

function baseRow(overrides: Record<string, unknown>) {
  return {
    id: 'mass-1',
    mass_date: '2026-08-23',
    mass_time: '10:30:00',
    observation: 'Twenty-First Sunday in Ordinary Time',
    sunday_cycle: null,
    readings_variant: null,
    liturgical_season: 'Ordinary Time',
    first_reading: 'Is 66:18-21',
    responsorial_psalm: 'Ps 117',
    second_reading: 'Heb 12:5-7',
    gospel_acclamation: 'Jn 14:6',
    gospel: 'Lk 13:22-30',
    setting_title: null, prelude_title: null, opening_title: null,
    psalm_title: null, preparation_title: null, communion_1_title: null,
    communion_2_title: null, praise_title: null, closing_title: null,
    notes: null, worship_aid: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      single: vi.fn(() => Promise.resolve({ data: h.massRow, error: null })),
      update: vi.fn((payload: Record<string, unknown>) => {
        h.updates.push(payload);
        return { eq: vi.fn(() => Promise.resolve({ error: null })) };
      }),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'mass-2' }, error: null })),
        })),
      })),
    })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/lib/liturgy/cachedReadings', () => ({
  readingsForDate: vi.fn(() => Promise.resolve([])),
  readingsFromCache: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/musicKit', () => ({ searchAppleMusic: vi.fn(() => Promise.resolve([])) }));

// The real dialog drags in the whole notation editor. Standing in for it, a
// button that fires the same onSaved callback the real composer fires once
// it has uploaded a score and its thumbnail — id, title, and an image URL —
// so this file can drive the planner's write path without any of that.
vi.mock('@/components/liturgy/PsalmComposerDialog', () => ({
  PsalmComposerDialog: ({ onSaved }: { onSaved?: (id: string, title: string, imageUrl: string | null) => void }) => (
    <button
      type="button"
      onClick={() => onSaved?.(...h.onSavedArgs!)}
    >
      fire onSaved
    </button>
  ),
}));
vi.mock('@/components/liturgy/ReadingsModal', () => ({ ReadingsModal: () => null }));

import LiturgyPlannerPage from './LiturgyPlannerPage';

async function openEditor() {
  render(
    <MemoryRouter initialEntries={['/dashboard/liturgy/mass-1']}>
      <Routes>
        <Route path="/dashboard/liturgy/:massId" element={<LiturgyPlannerPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.findByRole('button', { name: 'fire onSaved' });
}

beforeEach(() => {
  h.updates.length = 0;
  h.onSavedArgs = null;
});

describe('saving a composed psalm', () => {
  it('records the score id and does not write an image onto the Mass', async () => {
    h.massRow = baseRow({ worship_aid: {} });
    h.onSavedArgs = ['score-1', 'Psalm 117 — Twenty-First Sunday in Ordinary Time', 'https://storage.example.org/sheet-music/u1/psalms/1.jpg'];

    const fireButton = await openEditor();
    fireEvent.click(fireButton);
    fireEvent.click(screen.getAllByRole('button', { name: /^Save$/ })[0]);

    await waitFor(() => expect(h.updates).toHaveLength(1));
    const worshipAid = h.updates[0].worship_aid as Record<string, unknown>;
    expect(worshipAid.psalmScoreId).toBe('score-1');
    expect(worshipAid).not.toHaveProperty('psalmImageUrl');
    expect(h.updates[0].psalm_title).toBe('Psalm 117 — Twenty-First Sunday in Ordinary Time');
  });

  it('leaves an existing psalmImageUrl on the Mass untouched by a later save', async () => {
    // Data written before this change must not be scrubbed by an unrelated
    // save — only NEW writes stop adding the field.
    h.massRow = baseRow({
      worship_aid: { psalmImageUrl: 'https://storage.example.org/sheet-music/u1/psalms/old.jpg' },
    });
    h.onSavedArgs = ['score-2', 'Psalm 117 (re-engraved)', 'https://storage.example.org/sheet-music/u1/psalms/2.jpg'];

    const fireButton = await openEditor();
    fireEvent.click(fireButton);
    fireEvent.click(screen.getAllByRole('button', { name: /^Save$/ })[0]);

    await waitFor(() => expect(h.updates).toHaveLength(1));
    const worshipAid = h.updates[0].worship_aid as Record<string, unknown>;
    // Old data survives...
    expect(worshipAid.psalmImageUrl).toBe('https://storage.example.org/sheet-music/u1/psalms/old.jpg');
    // ...but the new save still only adds the id, not a fresh image.
    expect(worshipAid.psalmScoreId).toBe('score-2');
  });
});
