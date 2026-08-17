// @vitest-environment jsdom
//
// Final fix wave, Fix 2: copyright credits for licensed pieces must PRINT
// in the footer (not just show as a screen-only chip). Exercises FooterView
// via the exported PageItemView (FooterView itself isn't exported) with a
// 'block' unit pointed at a footer block, and a piece-group referencing
// pieces with varying rights_status/copyright_info.
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PageItemView, type RenderCtx } from './BlockRenderers';
import type { ProgramBlock } from '@/lib/concertProgram/types';
import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';

afterEach(cleanup);

function piece(over: Partial<ConcertProgramPiece> & { id: string; title: string }): ConcertProgramPiece {
  return {
    program_id: 'x', sort_order: 0, section_heading: null,
    composer: null, arranger: null, voicing: null,
    soloists: null, duration_seconds: null, program_notes: null,
    sheet_music_id: null, rights_status: null, copyright_info: null,
    ...over,
  };
}

function makeCtx(pieces: ConcertProgramPiece[]): RenderCtx {
  const footerBlock: ProgramBlock = { id: 'b-footer', kind: 'footer', showQr: false };
  const groupBlock: ProgramBlock = {
    id: 'g1', kind: 'piece-group', sectionHeading: null,
    pieceIds: pieces.map((p) => p.id), creditLine: null,
  };
  return {
    blocks: [groupBlock, footerBlock],
    piecesById: new Map(pieces.map((p) => [p.id, p])),
    roster: [],
    program: {
      title: 'Fall Concert', subtitle: null, event_date: null, venue: null,
      conductor: null, accompanist: null, performer_group: null,
    },
    orgName: null,
    logoUrl: null,
    qrDataUrl: null,
  };
}

function renderFooter(ctx: RenderCtx) {
  return render(<PageItemView item={{ unit: { type: 'block', blockId: 'b-footer' } }} ctx={ctx} />);
}

describe('FooterView rights credits', () => {
  it('prints a credit line for a licensed piece with copyright_info', () => {
    const p = piece({
      id: 'p1', title: 'Total Praise', rights_status: 'licensed',
      copyright_info: 'Used by permission of Hal Leonard',
    });
    renderFooter(makeCtx([p]));
    expect(screen.getByText('Total Praise — Used by permission of Hal Leonard')).toBeInTheDocument();
  });

  it('renders multiple credit lines in block (piece) order', () => {
    const a = piece({ id: 'p1', title: 'First Piece', rights_status: 'licensed', copyright_info: 'Credit A' });
    const b = piece({ id: 'p2', title: 'Second Piece', rights_status: 'licensed', copyright_info: 'Credit B' });
    const { container } = renderFooter(makeCtx([a, b]));
    const lines = Array.from(container.querySelectorAll('.cp-footer-rights')).map((el) => el.textContent);
    expect(lines).toEqual(['First Piece — Credit A', 'Second Piece — Credit B']);
  });

  it('renders nothing for public_domain, unknown, or null rights_status', () => {
    const pd = piece({ id: 'p1', title: 'PD Piece', rights_status: 'public_domain', copyright_info: 'Should not print' });
    const unknown = piece({ id: 'p2', title: 'Unknown Piece', rights_status: 'unknown', copyright_info: 'Should not print either' });
    const none = piece({ id: 'p3', title: 'No Status Piece', rights_status: null, copyright_info: null });
    const { container } = renderFooter(makeCtx([pd, unknown, none]));
    expect(container.querySelector('.cp-footer-rights')).toBeNull();
  });

  it('a licensed piece with empty/blank copyright_info prints nothing', () => {
    const empty = piece({ id: 'p1', title: 'Empty Credit', rights_status: 'licensed', copyright_info: '' });
    const blank = piece({ id: 'p2', title: 'Blank Credit', rights_status: 'licensed', copyright_info: '   ' });
    const { container } = renderFooter(makeCtx([empty, blank]));
    expect(container.querySelector('.cp-footer-rights')).toBeNull();
  });

  it('renders nothing (no rights section) when there are no licensed pieces at all', () => {
    const { container } = renderFooter(makeCtx([]));
    expect(container.querySelector('.cp-footer-rights')).toBeNull();
  });
});
