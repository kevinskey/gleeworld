// @vitest-environment jsdom
//
// The bug this file exists for.
//
// Three engraving fixes shipped — a 10.6 mm staff with colliding lyrics, a
// fixed four-inch card, lyrics at the aid's own 8 pt body size — and the
// printed worship aid looked exactly as it had before all three. It was
// drawing `worship_aid.psalmImageUrl`, or failing that a `thumbnail_url` off
// gw_sheet_music: either way, a JPEG engraved and uploaded at the moment the
// psalm was SAVED. Rendering code cannot reach into a picture that already
// exists, so every psalm in every tenant was frozen at its save-time
// engraving and every future improvement was going to look like it had not
// worked.
//
// So these tests are not "an image appears". Each one names which source the
// image came from, and the first fails outright if the page falls back to the
// stored raster while a stored score is available.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ── the database, as far as this page is concerned ────────────────────────

const STALE_JPEG = 'https://storage.example.org/sheet-music/u1/psalms/1754000000000.jpg';

interface SheetRow {
  id: string;
  title: string;
  xml_content: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

let massRow: Record<string, unknown>;
let sheetRows: SheetRow[];

vi.mock('@/integrations/supabase/client', () => {
  const make = (table: string) => {
    let eqValue: unknown = null;
    const b: Record<string, unknown> = {};
    const self = () => b;
    Object.assign(b, {
      select: self,
      contains: self,
      not: self,
      order: self,
      update: self,
      eq: (_col: string, v: unknown) => { eqValue = v; return b; },
      limit: () => Promise.resolve({ data: sheetRows, error: null }),
      single: () => Promise.resolve({ data: massRow, error: null }),
      maybeSingle: () => Promise.resolve({
        data: sheetRows.find((r) => r.id === eqValue) ?? null,
        error: null,
      }),
      // The real builder is thenable, and `update(...).eq(...)` is awaited.
      then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
      __table: table,
    });
    return b;
  };
  return { supabase: { from: (t: string) => make(t) } };
});

vi.mock('qrcode', () => ({ default: { toDataURL: () => Promise.resolve('data:image/png;base64,qr') } }));

// VexFlow needs real glyph boxes; the aid does not care what the notes look
// like, only that the staff it rasterises is the one drawn from the score.
vi.mock('@/pages/notation/NotationView', () => ({
  NotationView: ({ score }: { score: { title: string; elements: unknown[] } }) => (
    <svg data-testid="staff" data-title={score.title} data-notes={score.elements.length} />
  ),
}));

const svgToJpegBlob = vi.fn();
vi.mock('@/lib/notation/exportImage', () => ({
  svgToJpegBlob: (...a: unknown[]) => svgToJpegBlob(...a),
}));

import WorshipAidPage from './WorshipAidPage';
import { editorScoreToMusicXML } from '@/lib/notation/musicxmlWrite';
import { emptyScore, noteOf, type EditorScore } from '@/lib/notation/model';

const CURRENT_SCORE: EditorScore = {
  ...emptyScore(),
  title: 'Psalm 34:2-9 — 19th Sunday in Ordinary Time',
  elements: [
    { ...noteOf({ step: 'E', octave: 4, alter: 0 }, 'quarter'), lyric: 'Taste' },
    { ...noteOf({ step: 'G', octave: 4, alter: 0 }, 'quarter'), lyric: 'and' },
    { ...noteOf({ step: 'A', octave: 4, alter: 0 }, 'half'), lyric: 'see' },
  ],
};
const CURRENT_XML = editorScoreToMusicXML(CURRENT_SCORE);

const baseMass = {
  id: 'mass-1',
  mass_date: '2026-08-10',
  observation: '19th Sunday in Ordinary Time',
  liturgical_season: 'Ordinary Time',
  responsorial_psalm: 'Psalm 34:2-9',
  psalm_title: 'Psalm 34:2-9 — 19th Sunday in Ordinary Time',
  psalm_full: 'R. Taste and see the goodness of the Lord.',
  share_token: null,
  worship_aid: {},
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/dashboard/liturgy/mass-1/aid']}>
      <Routes>
        <Route path="/dashboard/liturgy/:id/aid" element={<WorshipAidPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Every image on the rendered aid, by src. */
const srcs = () => Array.from(document.querySelectorAll('img')).map((i) => i.getAttribute('src'));

beforeEach(() => {
  sheetRows = [];
  massRow = { ...baseMass };
  svgToJpegBlob.mockReset();
  svgToJpegBlob.mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }));
  URL.createObjectURL = vi.fn(() => 'blob:engraved-now');
  URL.revokeObjectURL = vi.fn();
  // jsdom implements neither, and the page reads both.
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({
      matches: false, media: q, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  if (typeof ResizeObserver === 'undefined') {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() { /* noop */ } unobserve() { /* noop */ } disconnect() { /* noop */ }
    };
  }
});

afterEach(cleanup);

describe('a stored score beats a stored picture', () => {
  it('engraves the score NOW instead of printing the JPEG saved with the aid', async () => {
    // The exact shape of the bug: the aid carries a picture engraved under the
    // old constants, AND the library holds the score it was made from. The
    // page must print the one it just drew.
    massRow = {
      ...baseMass,
      worship_aid: { psalmImageUrl: STALE_JPEG, psalmScoreId: 'score-1' },
    };
    sheetRows = [{
      id: 'score-1',
      title: 'Psalm 34:2-9 — 19th Sunday in Ordinary Time',
      xml_content: CURRENT_XML,
      thumbnail_url: STALE_JPEG,
      created_at: '2026-06-01T00:00:00Z',
    }];

    renderPage();

    await waitFor(() => expect(srcs()).toContain('blob:engraved-now'));
    // The whole point. If this ever passes with STALE_JPEG on the page, the
    // fix has been undone.
    expect(srcs()).not.toContain(STALE_JPEG);
    // And it really was engraved from the stored MusicXML, notes and all.
    expect(screen.getByTestId('staff')).toHaveAttribute('data-notes', '3');
    expect(screen.getByTestId('staff'))
      .toHaveAttribute('data-title', 'Psalm 34:2-9 — 19th Sunday in Ordinary Time');
  });

  it('never shows the stale raster, not even for the frame before the engraving lands', async () => {
    // buildWorshipAid falls back to settings.psalmImageUrl on its own, so a
    // page that merely passed the fresh URL "when ready" would flash the old
    // engraving on every load — and keep it forever if rasterising failed.
    let release!: (b: Blob) => void;
    svgToJpegBlob.mockReturnValue(new Promise<Blob>((r) => { release = r; }));
    massRow = { ...baseMass, worship_aid: { psalmImageUrl: STALE_JPEG, psalmScoreId: 'score-1' } };
    sheetRows = [{
      id: 'score-1', title: 'Psalm 34', xml_content: CURRENT_XML,
      thumbnail_url: STALE_JPEG, created_at: '2026-06-01T00:00:00Z',
    }];

    renderPage();
    await waitFor(() => expect(screen.getByTestId('staff')).toBeInTheDocument());
    expect(srcs()).not.toContain(STALE_JPEG);

    release(new Blob(['jpeg'], { type: 'image/jpeg' }));
    await waitFor(() => expect(srcs()).toContain('blob:engraved-now'));
  });

  it('keeps printing the stale raster off the page when the engraving fails', async () => {
    svgToJpegBlob.mockRejectedValue(new Error('music font 404'));
    massRow = { ...baseMass, worship_aid: { psalmImageUrl: STALE_JPEG, psalmScoreId: 'score-1' } };
    sheetRows = [{
      id: 'score-1', title: 'Psalm 34', xml_content: CURRENT_XML,
      thumbnail_url: STALE_JPEG, created_at: '2026-06-01T00:00:00Z',
    }];

    renderPage();
    await waitFor(() => expect(svgToJpegBlob).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('RESPONSORIAL PSALM')).toBeInTheDocument());
    expect(srcs()).not.toContain(STALE_JPEG);
  });

  it('finds the score by title when the Mass has no recorded id', async () => {
    // Plans composed before the id link existed. The matching is unchanged —
    // psalm_title first, because saving the setting writes it — but what it
    // now hunts for is the MusicXML rather than the picture.
    massRow = { ...baseMass, worship_aid: { psalmImageUrl: STALE_JPEG } };
    sheetRows = [{
      id: 'score-9',
      title: 'Psalm 34:2-9 — 19th Sunday in Ordinary Time',
      xml_content: CURRENT_XML,
      thumbnail_url: STALE_JPEG,
      created_at: '2026-06-01T00:00:00Z',
    }];

    renderPage();
    await waitFor(() => expect(srcs()).toContain('blob:engraved-now'));
    expect(srcs()).not.toContain(STALE_JPEG);
  });
});

describe('the fallback chain, for aids with no score behind them', () => {
  it('uses the stored image when the matched row has no MusicXML', async () => {
    massRow = { ...baseMass, worship_aid: { psalmImageUrl: STALE_JPEG } };
    sheetRows = [{
      id: 'score-2', title: 'Psalm 34:2-9 — 19th Sunday in Ordinary Time',
      xml_content: null, thumbnail_url: STALE_JPEG, created_at: '2026-06-01T00:00:00Z',
    }];

    renderPage();
    await waitFor(() => expect(srcs()).toContain(STALE_JPEG));
    expect(screen.queryByTestId('staff')).toBeNull();
  });

  it('uses the stored image when the library has nothing at all', async () => {
    massRow = { ...baseMass, worship_aid: { psalmImageUrl: STALE_JPEG } };
    sheetRows = [];

    renderPage();
    await waitFor(() => expect(srcs()).toContain(STALE_JPEG));
  });

  it('falls back to a library thumbnail when the aid stored no picture', async () => {
    const THUMB = 'https://storage.example.org/sheet-music/u1/psalms/thumb.jpg';
    massRow = { ...baseMass, worship_aid: {} };
    sheetRows = [{
      id: 'score-3', title: 'Psalm 34:2-9 — 19th Sunday in Ordinary Time',
      xml_content: null, thumbnail_url: THUMB, created_at: '2026-06-01T00:00:00Z',
    }];

    renderPage();
    await waitFor(() => expect(srcs()).toContain(THUMB));
  });

  it('prints the psalm block with no music when there is neither', async () => {
    massRow = { ...baseMass, worship_aid: {} };
    sheetRows = [];

    renderPage();
    await waitFor(() => expect(screen.getByText('RESPONSORIAL PSALM')).toBeInTheDocument());
    expect(screen.queryByTestId('staff')).toBeNull();
    expect(srcs().filter(Boolean)).toEqual([]);
  });

  it('never prints an unrelated setting when nothing matches by name', async () => {
    // The newest-in-tenant fallback is deliberately GONE: a Sunday with no
    // composed setting used to silently print LAST week's psalm ("stale
    // psalm", Kevin 2026-08-25), which reads as correct until someone sings
    // from it. No name match now means no engraved score at all — the aid
    // prints the psalm as prose until one is composed or a graphic is
    // uploaded.
    massRow = { ...baseMass, worship_aid: {} };
    sheetRows = [
      { id: 'empty', title: 'A blank psalm', xml_content: null, thumbnail_url: null, created_at: '2026-08-01T00:00:00Z' },
      { id: 'score-4', title: 'Some other setting', xml_content: CURRENT_XML, thumbnail_url: null, created_at: '2026-06-01T00:00:00Z' },
    ];

    renderPage();
    // Give the resolution effect a beat to settle, then assert the
    // unrelated score was NOT engraved.
    await new Promise((r) => setTimeout(r, 50));
    expect(srcs()).not.toContain('blob:engraved-now');
  });
});
