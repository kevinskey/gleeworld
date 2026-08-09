// @vitest-environment jsdom
//
// Pins the two Critical defects a review found in the two-pane rewrite:
//
// 1. The hidden `<input type="file">` used to live inside `coverUpload`,
//    which the rail renders ONLY on the Cover panel. `blockList`'s
//    per-panel "Add image" buttons (rendered on every OTHER panel) called
//    `fileRef.current?.click()` against an input that was never mounted —
//    a silent no-op with no error and no toast. The fix hoists the input
//    to a single page-level element, independent of which panel is
//    selected. Test 1 below pins that: it is present regardless of panel,
//    and clicking "Add image" on an interior panel actually triggers it.
//
// 2. Below `lg`, the desktop rail used to stay mounted (only CSS-hidden)
//    while the drawer's rail could ALSO be mounted, giving two
//    `<input ref={fileRef}>` nodes and duplicate ids on the Cover/Notices
//    fields. The fix renders at most one AidControlRail at a time, gated
//    on the same 1024px breakpoint the `lg:` classes use. Test 2 pins the
//    single-input invariant across every panel a user can select.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

afterEach(cleanup);

// jsdom does not implement matchMedia; useIsMobile (src/hooks/use-mobile.tsx)
// calls it in a useEffect to stay in sync with viewport changes. The initial
// value it renders with comes from window.innerWidth instead (jsdom defaults
// to 1024, i.e. "not mobile" — the desktop rail is what mounts below), so
// this stub only needs to satisfy the effect's subscribe/unsubscribe calls.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

// ── Supabase stub ────────────────────────────────────────────────────────
const massRow = {
  id: 'mass-1',
  mass_date: '2026-08-09',
  observation: 'Twentieth Sunday',
  liturgical_season: null,
  setting_title: null,
  prelude_title: null,
  opening_title: null,
  psalm_title: null,
  responsorial_psalm: null,
  preparation_title: null,
  communion_1_title: null,
  communion_2_title: null,
  praise_title: null,
  closing_title: null,
  first_reading: null,
  second_reading: null,
  gospel_acclamation: null,
  gospel: null,
  worship_aid: null,
  share_token: null,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })) },
    from: vi.fn((table: string) => {
      if (table === 'gw_liturgy_masses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: massRow, error: null })),
          update: vi.fn().mockReturnThis(),
        };
      }
      // gw_sheet_music: the psalm-image lookup effect.
      return {
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }),
  },
}));

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,fake')) },
}));

// jsdom's default innerWidth (1024) already reads as "not mobile" under
// useIsMobile (width < 1024), so the desktop rail is what renders here —
// deliberately: it is the rail most likely to stay mounted incorrectly,
// since it used to be CSS-hidden rather than unmounted.

import WorshipAidPage from './WorshipAidPage';

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/dashboard/liturgy/mass-1/worship-aid']}>
      <WorshipAidPage />
    </MemoryRouter>,
  );
  // Wait for the load effect to resolve and the real layout to mount.
  await screen.findByText('Worship Aid');
}

describe('WorshipAidPage — file input singleton (Critical 1 & 2)', () => {
  it('mounts exactly one file input, and it still fires on an interior panel', async () => {
    await renderPage();

    // Default panel is an interior one (insideLeft) — the Cover-only slot
    // is not showing.
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(1);

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    // "Add image" belongs to blockList, rendered for insideLeft/insideRight/back.
    const addImageButtons = screen.getAllByRole('button', { name: /add image/i });
    expect(addImageButtons.length).toBeGreaterThan(0);
    fireEvent.click(addImageButtons[0]);

    // Before the fix this never fired: fileRef.current was null because the
    // input only existed inside coverUpload, which isn't rendered here.
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });

  it('keeps exactly one file input mounted across every panel, including Cover', async () => {
    await renderPage();

    for (const label of ['Cover', 'Inside left', 'Inside right', 'Back']) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(document.querySelectorAll('input[type="file"]')).toHaveLength(1);
    }
  });

  it('fires the shared input from the Cover panel’s own trigger too', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Cover' }));

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: /cover image/i }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
});

describe('WorshipAidPage — single mounted rail (Important 3)', () => {
  it('does not duplicate Cover field ids across the desktop rail and the drawer', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Cover' }));

    // At the default (non-mobile) jsdom width the drawer stays closed and
    // unmounted, so ids that AidControlRail hard-codes must appear once.
    expect(document.querySelectorAll('#aid-title')).toHaveLength(1);
    expect(document.querySelectorAll('#aid-spine')).toHaveLength(1);
  });
});

describe('WorshipAidPage — overflow guidance restored (Important 4)', () => {
  it('says nothing when nothing is dropped', async () => {
    await renderPage();
    expect(screen.queryByText(/does not fit|do not fit/)).toBeNull();
  });
});

describe('WorshipAidPage — direct-editing hint restored (Minor 1)', () => {
  it('shows the click-to-edit hint above the block list on an interior panel', async () => {
    await renderPage();
    expect(screen.getByText(/click the text on the page/i)).toBeInTheDocument();
  });
});
