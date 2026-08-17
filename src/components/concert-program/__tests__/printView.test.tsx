// @vitest-environment jsdom
//
// ConcertProgramPrintView is the true-paper print/save-PDF overlay: letter
// sheets render one-per-page; half-fold imposes panels two-per-physical-
// sheet via imposeHalfFold (Task 6/impose.ts) so duplex printing folds into
// a booklet. Covers the @page injection/cleanup, the printing-program body
// class, and that imposition order lands on the DOM exactly as
// imposeHalfFold computes it (front/back panel indexes, including blanks
// for a non-multiple-of-4 panel count).
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import { ConcertProgramPrintView } from '../ConcertProgramPrintView';
import type { RenderCtx } from '../blocks/BlockRenderers';
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

function makePages(n: number): PageItem[][] {
  return Array.from({ length: n }, (_, i) => [{ unit: { type: 'block' as const, blockId: i === 0 ? 't' : 'f' } }]);
}

function headStyleTexts(): string[] {
  return Array.from(document.head.querySelectorAll('style')).map((s) => s.textContent ?? '');
}

describe('ConcertProgramPrintView — letter', () => {
  it('renders one .cp-sheet per page and injects the letter @page rule, removing it on unmount', () => {
    const pages = makePages(3);
    const { unmount } = render(
      <ConcertProgramPrintView pages={pages} ctx={makeCtx()} design="modern-clean" format="letter-portrait" onClose={() => {}} />,
    );
    expect(document.querySelectorAll('.cp-sheet')).toHaveLength(3);
    expect(headStyleTexts().some((t) => t.includes('size: 8.5in 11in'))).toBe(true);

    unmount();
    expect(headStyleTexts().some((t) => t.includes('size: 8.5in 11in'))).toBe(false);
  });

  it('adds printing-program to body on mount and removes it on unmount', () => {
    expect(document.body.classList.contains('printing-program')).toBe(false);
    const { unmount } = render(
      <ConcertProgramPrintView pages={makePages(1)} ctx={makeCtx()} design="modern-clean" format="letter-portrait" onClose={() => {}} />,
    );
    expect(document.body.classList.contains('printing-program')).toBe(true);
    unmount();
    expect(document.body.classList.contains('printing-program')).toBe(false);
  });
});

describe('ConcertProgramPrintView — half-fold imposition', () => {
  it('injects the half-fold @page rule', () => {
    const { unmount } = render(
      <ConcertProgramPrintView pages={makePages(4)} ctx={makeCtx()} design="modern-clean" format="half-fold" onClose={() => {}} />,
    );
    expect(headStyleTexts().some((t) => t.includes('size: 11in 8.5in'))).toBe(true);
    unmount();
  });

  it('4 panels: 1 sheet x 2 sides, imposed order front [3,0] back [1,2]', () => {
    render(
      <ConcertProgramPrintView pages={makePages(4)} ctx={makeCtx()} design="modern-clean" format="half-fold" onClose={() => {}} />,
    );
    // createPortal renders into document.body, a sibling of RTL's own
    // container div — assertions must query `document`, not `container`.
    const sheets = document.querySelectorAll('.cp-print-sheet');
    expect(sheets).toHaveLength(2); // one sheet, front + back

    const front = sheets[0];
    const frontPanels = Array.from(front.querySelectorAll('[data-panel-idx]')).map((el) => el.getAttribute('data-panel-idx'));
    expect(frontPanels).toEqual(['3', '0']);

    const back = sheets[1];
    const backPanels = Array.from(back.querySelectorAll('[data-panel-idx]')).map((el) => el.getAttribute('data-panel-idx'));
    expect(backPanels).toEqual(['1', '2']);
  });

  it('6 real panels pad to 8: blank panel containers render for idx 6 and 7', () => {
    render(
      <ConcertProgramPrintView pages={makePages(6)} ctx={makeCtx()} design="modern-clean" format="half-fold" onClose={() => {}} />,
    );
    const allPanels = Array.from(document.querySelectorAll('[data-panel-idx]'));
    const idxs = allPanels.map((el) => el.getAttribute('data-panel-idx')).sort((a, b) => Number(a) - Number(b));
    // 2 sheets (8 padded panels / 4) => 4 print-sheets (front+back each) => 8 panel containers total
    expect(idxs).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);

    const blank6 = allPanels.find((el) => el.getAttribute('data-panel-idx') === '6');
    const blank7 = allPanels.find((el) => el.getAttribute('data-panel-idx') === '7');
    expect(blank6).toBeTruthy();
    expect(blank7).toBeTruthy();
    expect(blank6?.textContent).toBe('');
    expect(blank7?.textContent).toBe('');
  });
});
