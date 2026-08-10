// @vitest-environment jsdom
//
// The congregation's copy has the same bug, and it matters more here: this is
// the page people actually hold up in a pew. It drew `settings.psalmImageUrl`
// — the raster made when the setting was saved — so every improvement to the
// engraver was invisible on it for exactly as long as that was true.
//
// It cannot re-engrave the way the editor does. This page is anonymous, and
// gw_sheet_music admits anon only to `is_public = true AND is_archived =
// false` rows inside anon_tenant_id(); checked against pg_policies, and every
// psalm setting in the database has is_public = false. So the MusicXML rides
// through gw_worship_aid_by_token, the same SECURITY DEFINER projection the
// rest of the page reads.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const STALE_JPEG = 'https://storage.example.org/sheet-music/u1/psalms/1754000000000.jpg';

let rpcRow: Record<string, unknown> | null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: () => Promise.resolve({ data: rpcRow ? [rpcRow] : [], error: null }) },
}));

vi.mock('@/pages/notation/NotationView', () => ({
  NotationView: ({ score }: { score: { title: string; elements: unknown[] } }) => (
    <svg data-testid="staff" data-notes={score.elements.length} data-title={score.title} />
  ),
}));

const svgToJpegBlob = vi.fn();
vi.mock('@/lib/notation/exportImage', () => ({
  svgToJpegBlob: (...a: unknown[]) => svgToJpegBlob(...a),
}));

import WorshipAidPublicPage from './WorshipAidPublicPage';
import { editorScoreToMusicXML } from '@/lib/notation/musicxmlWrite';
import { emptyScore, noteOf, type EditorScore } from '@/lib/notation/model';

const CURRENT_SCORE: EditorScore = {
  ...emptyScore(),
  title: 'Psalm 34:2-9',
  elements: [
    { ...noteOf({ step: 'E', octave: 4, alter: 0 }, 'quarter'), lyric: 'Taste' },
    { ...noteOf({ step: 'G', octave: 4, alter: 0 }, 'quarter'), lyric: 'and' },
  ],
};
const CURRENT_XML = editorScoreToMusicXML(CURRENT_SCORE);

// As psalmLines renders it: the "R." marker is consumed into isRefrain.
const PROSE_SOURCE = 'R. Taste and see the goodness of the Lord.';
const PROSE = 'Taste and see the goodness of the Lord.';

const baseRow = {
  mass_date: '2026-08-10',
  mass_time: '10:00:00',
  observation: '19th Sunday in Ordinary Time',
  liturgical_season: 'Ordinary Time',
  responsorial_psalm: 'Psalm 34:2-9',
  psalm_title: 'Psalm 34:2-9',
  psalm_full: PROSE_SOURCE,
  worship_aid: {},
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/worship-aid/tok-1']}>
      <Routes>
        <Route path="/worship-aid/:token" element={<WorshipAidPublicPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const srcs = () => Array.from(document.querySelectorAll('img')).map((i) => i.getAttribute('src'));

beforeEach(() => {
  rpcRow = { ...baseRow };
  svgToJpegBlob.mockReset();
  svgToJpegBlob.mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }));
  URL.createObjectURL = vi.fn(() => 'blob:engraved-now');
  URL.revokeObjectURL = vi.fn();
});

afterEach(cleanup);

describe('the phone edition engraves the psalm at read time', () => {
  it('draws the score from the projection instead of the picture saved with the aid', async () => {
    rpcRow = { ...baseRow, psalm_xml: CURRENT_XML, worship_aid: { psalmImageUrl: STALE_JPEG } };

    renderPage();

    await waitFor(() => expect(srcs()).toContain('blob:engraved-now'));
    expect(srcs()).not.toContain(STALE_JPEG);
    expect(screen.getByTestId('staff')).toHaveAttribute('data-notes', '2');
  });

  it('does not print the words under a psalm it is about to print as music', async () => {
    // The prose psalm is the fallback for a Sunday nobody has set. Showing it
    // for the beat before the staff arrives would make the page jump under
    // someone's thumb mid-Mass.
    let release!: (b: Blob) => void;
    svgToJpegBlob.mockReturnValue(new Promise<Blob>((r) => { release = r; }));
    rpcRow = { ...baseRow, psalm_xml: CURRENT_XML };

    renderPage();
    await waitFor(() => expect(screen.getByTestId('staff')).toBeInTheDocument());
    expect(screen.queryByText(PROSE)).toBeNull();

    release(new Blob(['jpeg'], { type: 'image/jpeg' }));
    await waitFor(() => expect(srcs()).toContain('blob:engraved-now'));
    expect(screen.queryByText(PROSE)).toBeNull();
  });

  it('falls back to the WORDS when the engraving fails, not to an empty heading', async () => {
    svgToJpegBlob.mockRejectedValue(new Error('music font 404'));
    rpcRow = { ...baseRow, psalm_xml: CURRENT_XML };

    renderPage();
    await waitFor(() => expect(screen.getByText(PROSE)).toBeInTheDocument());
    expect(srcs()).toEqual([]);
  });

  it('still prints a stored picture for a Mass with no score behind it', async () => {
    // A plan whose setting predates the id link, or was never composed here.
    // psalm_xml is null and the stored raster is all there is.
    rpcRow = { ...baseRow, psalm_xml: null, worship_aid: { psalmImageUrl: STALE_JPEG } };

    renderPage();
    await waitFor(() => expect(srcs()).toContain(STALE_JPEG));
    expect(screen.queryByText(PROSE)).toBeNull();
    expect(screen.queryByTestId('staff')).toBeNull();
  });

  it('prints the psalm as prose when there is no setting at all', async () => {
    rpcRow = { ...baseRow };

    renderPage();
    await waitFor(() => expect(screen.getByText(PROSE)).toBeInTheDocument());
    expect(srcs()).toEqual([]);
  });

  it('survives a projection that has no psalm_xml column yet', async () => {
    // The frontend can reach production before the migration does. A row with
    // the field simply absent must behave as one with no setting, not throw
    // on a page a congregation is looking at.
    rpcRow = { ...baseRow };
    delete (rpcRow as Record<string, unknown>).psalm_xml;

    renderPage();
    await waitFor(() => expect(screen.getByText(PROSE)).toBeInTheDocument());
    expect(svgToJpegBlob).not.toHaveBeenCalled();
  });
});
