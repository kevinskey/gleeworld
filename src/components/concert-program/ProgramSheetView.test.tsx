// @vitest-environment jsdom
//
// A "sheet" here is the true, printed size of the page — 8.5x11 for letter,
// 5.5x8.5 per reading-order panel for half-fold — set as an inline style so
// there is no daylight between what the editor previews and what prints.
// The measurement pipeline (useBlockMeasurements) is what makes the *content*
// paginate correctly beforehand; this component only has to lay out whatever
// pages it is handed, at the right physical size, one sheet per page.
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProgramSheetView } from './ProgramSheetView';
import type { RenderCtx } from './blocks/BlockRenderers';
import type { PageItem } from '@/lib/concertProgram/paginate';
import type { ProgramBlock } from '@/lib/concertProgram/types';

afterEach(cleanup);

const title: ProgramBlock = { id: 't', kind: 'title', showLogo: false, showOrgName: false };
const footer: ProgramBlock = { id: 'f', kind: 'footer' };

function makeCtx(): RenderCtx {
  return {
    blocks: [title, footer],
    piecesById: new Map(),
    roster: [],
    program: {
      title: 'Spring Concert', subtitle: null, event_date: null, venue: null,
      conductor: null, accompanist: null, performer_group: null,
    },
    orgName: null,
    logoUrl: null,
    qrDataUrl: null,
  };
}

// Title on page 1, footer on page 2 — as if pagination had already split the
// document at two units.
const twoPages: PageItem[][] = [
  [{ unit: { type: 'block', blockId: 't' } }],
  [{ unit: { type: 'block', blockId: 'f' } }],
];

describe('ProgramSheetView', () => {
  it('renders one .cp-sheet per page, sized at the true letter sheet', () => {
    const { container } = render(
      <ProgramSheetView pages={twoPages} ctx={makeCtx()} design="modern-clean" format="letter-portrait" />,
    );
    const sheets = container.querySelectorAll('.cp-sheet');
    expect(sheets).toHaveLength(2);
    expect((sheets[0] as HTMLElement).style.width).toBe('8.5in');
    expect((sheets[0] as HTMLElement).style.height).toBe('11in');
    expect((sheets[1] as HTMLElement).style.width).toBe('8.5in');
  });

  it('renders half-fold sheets at the true panel size, not the full letter sheet', () => {
    const { container } = render(
      <ProgramSheetView pages={twoPages} ctx={makeCtx()} design="modern-clean" format="half-fold" />,
    );
    const sheets = container.querySelectorAll('.cp-sheet');
    expect(sheets).toHaveLength(2);
    expect((sheets[0] as HTMLElement).style.width).toBe('5.5in');
    expect((sheets[0] as HTMLElement).style.height).toBe('8.5in');
    expect((sheets[0] as HTMLElement).className).toContain('cp-format-half-fold');
  });

  it('keeps the title block on the first sheet only', () => {
    const { container } = render(
      <ProgramSheetView pages={twoPages} ctx={makeCtx()} design="modern-clean" format="letter-portrait" />,
    );
    const sheets = container.querySelectorAll('.cp-sheet');
    const titleEl = screen.getByText('Spring Concert');
    expect(sheets[0].contains(titleEl)).toBe(true);
    expect(sheets[1].contains(titleEl)).toBe(false);
  });
});
