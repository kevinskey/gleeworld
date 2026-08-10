// @vitest-environment jsdom
//
// The Observation field auto-fills with the day's liturgical title, and
// never at the expense of a title a parish typed itself.
//
// The distinction the page relies on is null vs '':
//   null  — the field has never been set (what INSERT leaves behind, and
//           what every plan made before titles covered ordinary days has).
//           This, and only this, is auto-filled on open.
//   ''    — the user emptied the field. The Observation input writes the
//           raw value, so an emptied field is '' and stays cleared.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

afterEach(cleanup);

const OBSERVATION_PLACEHOLDER = 'e.g. Solemnity of the Most Holy Trinity';

// vi.mock factories hoist above the imports, so the mutable row the stub
// serves has to be hoisted with them.
const h = vi.hoisted(() => ({
  massRow: {} as Record<string, unknown>,
  updates: [] as Array<Record<string, unknown>>,
  inserts: [] as Array<Record<string, unknown>>,
}));

function baseRow(overrides: Record<string, unknown>) {
  return {
    id: 'mass-1',
    mass_date: '2026-08-23',
    mass_time: '10:30:00',
    observation: null,
    sunday_cycle: null,
    readings_variant: null,
    liturgical_season: null,
    // Non-empty readings so the silent auto-pull effect stays out of the way.
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
      insert: vi.fn((payload: Record<string, unknown>) => {
        h.inserts.push(payload);
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'mass-2' }, error: null })),
          })),
        };
      }),
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

// The composer drags in the whole notation editor, and the readings sheet
// hits the network. Neither is what this file is about.
vi.mock('@/components/liturgy/PsalmComposerDialog', () => ({
  PsalmComposerDialog: () => null,
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
  return screen.findByPlaceholderText(OBSERVATION_PLACEHOLDER) as Promise<HTMLInputElement>;
}

beforeEach(() => {
  h.updates.length = 0;
  h.inserts.length = 0;
});

describe('Observation auto-fill', () => {
  it('names an ordinary Sunday that was stored untitled', async () => {
    h.massRow = baseRow({ observation: null });
    const input = await openEditor();
    // 23 Aug 2026 — the day the field used to come back empty on.
    expect(input.value).toBe('Twenty-First Sunday in Ordinary Time');
    // …and the heading follows it.
    expect(screen.getByRole('heading', { level: 1 }))
      .toHaveTextContent(/^Twenty-First Sunday in Ordinary Time$/);
  });

  it('names an ordinary weekday too', async () => {
    h.massRow = baseRow({ observation: null, mass_date: '2026-08-24' });
    const input = await openEditor();
    expect(input.value).toBe('Monday of the Twenty-First Week in Ordinary Time');
  });

  it('leaves a named solemnity alone — the feast table still wins', async () => {
    h.massRow = baseRow({ observation: null, mass_date: '2026-08-15' });
    const input = await openEditor();
    expect(input.value).toBe('Assumption of the Blessed Virgin Mary');
  });

  it('never overwrites a title the parish typed', async () => {
    h.massRow = baseRow({ observation: 'Parish Feast of the Dedication' });
    const input = await openEditor();
    expect(input.value).toBe('Parish Feast of the Dedication');
  });

  it('leaves a title the parish typed that happens to read like ours', async () => {
    // The old heuristic guessed from the wording and would have replaced
    // this, because it starts with "Twenty-First Sunday".
    h.massRow = baseRow({ observation: 'Twenty-First Sunday in Ordinary Time — Homecoming' });
    const input = await openEditor();
    expect(input.value).toBe('Twenty-First Sunday in Ordinary Time — Homecoming');
  });

  it('respects a field the user deliberately cleared', async () => {
    h.massRow = baseRow({ observation: '' });
    const input = await openEditor();
    expect(input.value).toBe('');
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(/Ordinary Time/);
  });

  it('saves an emptied field as "" so it is not auto-filled again', async () => {
    h.massRow = baseRow({ observation: null });
    const input = await openEditor();
    expect(input.value).toBe('Twenty-First Sunday in Ordinary Time');

    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    // Two Save buttons render (sticky header + footer); either drives the
    // same handler.
    fireEvent.click(screen.getAllByRole('button', { name: /^Save$/ })[0]);

    await waitFor(() => expect(h.updates).toHaveLength(1));
    // '' (cleared on purpose), not null (never set) — the whole distinction.
    expect(h.updates[0].observation).toBe('');
    expect(h.updates[0].observation).not.toBeNull();
  });

  it('carries a typed title into the save when the date is changed afterwards', async () => {
    // Changing the date leaves this date's plan on this date and opens the
    // other date's own plan, so the typed title is saved, not migrated.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      h.massRow = baseRow({ observation: null });
      const input = await openEditor();
      fireEvent.change(input, { target: { value: 'Parish Feast of the Dedication' } });

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(dateInput.value).toBe('2026-08-23');
      fireEvent.change(dateInput, { target: { value: '2026-08-30' } });
      await vi.advanceTimersByTimeAsync(800);

      await waitFor(() => expect(h.updates).toHaveLength(1));
      expect(h.updates[0].observation).toBe('Parish Feast of the Dedication');
      expect(h.updates[0].mass_date).toBe('2026-08-23');

      // The new date starts its own plan, titled from the calendar.
      await waitFor(() => expect(h.inserts).toHaveLength(1));
      expect(h.inserts[0].mass_date).toBe('2026-08-30');
      expect(h.inserts[0].observation).toBe('Twenty-Second Sunday in Ordinary Time');
    } finally {
      vi.useRealTimers();
    }
  });
});
