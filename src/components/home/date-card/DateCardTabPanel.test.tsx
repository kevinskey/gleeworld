// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const save = vi.hoisted(() => vi.fn());
const modules = vi.hoisted(() => ({ current: [] as { module_id: string }[] }));
// Stable object identity across renders (mirrors DateCardSlot.test.tsx's
// mockSetting ref pattern). A fresh object literal returned per call is what
// originally caused the setting -> effect -> setState -> render -> new
// setting loop; this ref keeps the mocked hook's return value referentially
// stable the way the real react-query hook's memoized `data` is, so these
// tests exercise the intended dependency contract instead of masking a
// component-level bug behind a well-behaved mock.
const mockSetting = vi.hoisted(() => ({
  current: { v: 1 as const, type: 'plain', config: {} as Record<string, unknown> },
}));
// useDateCardConfig itself is a vi.fn (rather than a plain factory) so the
// identity-churn regression test below can swap in a deliberately UNSTABLE
// implementation — reproducing the shape of the original buggy mock — to
// prove the component itself survives it, not just that this file's default
// mock is polite.
const useDateCardConfigMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useDateCardConfig', () => ({
  useDateCardConfig: useDateCardConfigMock,
}));
vi.mock('@/hooks/useModuleAccess', () => ({
  useTenantModules: () => ({ data: modules.current, isLoading: false }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: {} })) } },
}));

import { DateCardTabPanel } from './DateCardTabPanel';

afterEach(() => {
  cleanup();
  save.mockClear();
  mockSetting.current = { v: 1, type: 'plain', config: {} };
  modules.current = [];
  useDateCardConfigMock.mockReset();
  useDateCardConfigMock.mockImplementation(() => ({
    setting: mockSetting.current,
    loading: false,
    save,
  }));
});

// Establish the default (stable) implementation before the describe block's
// own tests run too.
useDateCardConfigMock.mockImplementation(() => ({
  setting: mockSetting.current,
  loading: false,
  save,
}));

describe('DateCardTabPanel', () => {
  it('lists every registered card type', () => {
    render(<DateCardTabPanel canManage />);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Up next')).toBeInTheDocument();
    expect(screen.getByText('Today at a glance')).toBeInTheDocument();
    expect(screen.getByText('Liturgical day')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('marks an unavailable type as needing an add-on', () => {
    modules.current = [];
    render(<DateCardTabPanel canManage />);
    expect(screen.getByText('Add-on required')).toBeInTheDocument();
  });

  it('hides the save button when the user cannot manage', () => {
    render(<DateCardTabPanel canManage={false} />);
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('saves the selected type', () => {
    render(<DateCardTabPanel canManage />);
    fireEvent.click(screen.getByText('Today at a glance'));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: 'today' }));
  });

  // Regression for the render loop: the sync effect must key off the
  // PERSISTED CONTENT of `setting`, not its object identity.
  //
  // This reproduces the original trigger directly — a hook mock that hands
  // back a brand-new object literal (same content, new reference) on every
  // call, exactly like the pre-fix test mock and like a hand-rolled,
  // non-memoizing hook implementation would. If DateCardTabPanel's effect
  // ever regresses to depending on `setting` (or on `config`/`type`
  // individually without a content-stable key), a normal interaction —
  // picking a different type, which is the same click the "saves the
  // selected type" test above performs — restarts an unconditional
  // setState-in-effect loop: render -> effect -> setState -> render -> ...
  //
  // IMPORTANT: this loop was empirically confirmed to be a genuine
  // synchronous, unbounded hang, not something that throws a catchable
  // "Maximum update depth exceeded" error. (Verified by temporarily
  // reverting the fix and running just this test: even a 40s `perl alarm`
  // sent to the wrapping process did not stop it — vitest's actual worker is
  // a grandchild process untouched by a signal sent to the shell wrapper —
  // and the run had to be killed by hand well past two minutes.) A naive
  // "render, then assert no throw / assert call count" test would therefore
  // hang the whole suite forever the moment this bug came back, which is
  // exactly the failure mode we must not ship.
  //
  // So the mock enforces its OWN bound: it counts its calls and throws once
  // a call budget is exceeded. That throw happens inside the hook, during
  // React's render phase, which surfaces synchronously through
  // `fireEvent.click` (React 18 batches and flushes the update, including
  // the resulting effect chain, before the event handler call returns) —
  // guaranteeing this test terminates in milliseconds and FAILS on a
  // reintroduced loop, instead of ever reaching the real unbounded case.
  it('does not loop when the config hook returns a new object identity every render', () => {
    const CALL_BUDGET = 30; // far above the small, fixed number of renders a correct sync produces
    let calls = 0;
    useDateCardConfigMock.mockImplementation(() => {
      calls += 1;
      if (calls > CALL_BUDGET) {
        throw new Error(
          `useDateCardConfig called ${calls} times — looks like a render loop (budget ${CALL_BUDGET})`,
        );
      }
      return {
        setting: { v: 1, type: mockSetting.current.type, config: { ...mockSetting.current.config } },
        loading: false,
        save,
      };
    });

    render(<DateCardTabPanel canManage />);
    fireEvent.click(screen.getByText('Today at a glance'));

    expect(screen.getByText('Date card')).toBeInTheDocument();
    expect(calls).toBeLessThanOrEqual(CALL_BUDGET);
  });
});
