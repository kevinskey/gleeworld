// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DateCardContext } from './types';

const mockSetting = vi.hoisted(() => ({ current: { v: 1, type: 'plain', config: {} } }));
const mockSave = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@/hooks/useDateCardConfig', () => ({
  useDateCardConfig: () => ({ setting: mockSetting.current, loading: false, save: mockSave }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: {} })) } },
}));

import { DateCardSlot } from './DateCardSlot';

// Radix's DropdownMenuTrigger opens on native `pointerdown`, not `click`, and
// jsdom has no PointerEvent — same suite-scoped polyfill MyWorldGroups.test
// uses (see its header comment for the full story).
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).PointerEvent = PointerEventPolyfill;
  }
});

const ctx: DateCardContext = {
  now: new Date('2026-07-18T09:30:00'),
  firstName: 'Kevin',
  ensembleName: 'Concert Choir',
  upNext: null,
  todayRows: [],
};

const renderSlot = (props: Partial<React.ComponentProps<typeof DateCardSlot>> = {}) =>
  render(
    <MemoryRouter>
      <DateCardSlot ctx={ctx} activeAddons={[]} {...props} />
    </MemoryRouter>,
  );

const openMenu = () =>
  fireEvent.pointerDown(
    screen.getByRole('button', { name: /change date card/i }),
    { button: 0, ctrlKey: false },
  );

afterEach(() => {
  cleanup();
  mockSave.mockClear();
});

describe('DateCardSlot', () => {
  it('renders the configured card', () => {
    mockSetting.current = { v: 1, type: 'today', config: {} };
    renderSlot();
    expect(screen.getByText('Clear day')).toBeInTheDocument();
  });

  it('falls back to plain when the required add-on is missing', () => {
    mockSetting.current = { v: 1, type: 'liturgical', config: {} };
    renderSlot();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('renders the liturgical card when the add-on is active', () => {
    mockSetting.current = { v: 1, type: 'liturgical', config: {} };
    renderSlot({ activeAddons: ['liturgy_planner'] });
    expect(screen.queryByText('Clear day')).not.toBeInTheDocument();
  });

  it('falls back to plain for an unknown type', () => {
    mockSetting.current = { v: 1, type: 'from-the-future', config: {} };
    renderSlot();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('shows no type switcher to members', () => {
    mockSetting.current = { v: 1, type: 'plain', config: {} };
    renderSlot();
    expect(screen.queryByRole('button', { name: /change date card/i })).not.toBeInTheDocument();
  });

  it('lets an admin switch the card type from the corner dropdown', async () => {
    mockSetting.current = { v: 1, type: 'plain', config: {} };
    renderSlot({ canManage: true });
    openMenu();
    fireEvent.click(await screen.findByText('Today at a glance'));
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({ v: 1, type: 'today', config: {} }),
    );
  });

  it('carries the stored config over unchanged on a switch', async () => {
    const config = { eyebrow: 'e', title: 't', subtitle: '' };
    mockSetting.current = { v: 1, type: 'custom', config };
    renderSlot({ canManage: true });
    openMenu();
    fireEvent.click(await screen.findByText('Date'));
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({ v: 1, type: 'plain', config }),
    );
  });

  it('renders the switcher inline in the eyebrow row, not as an overlay', () => {
    mockSetting.current = { v: 1, type: 'plain', config: {} };
    renderSlot({ canManage: true });
    const trigger = screen.getByRole('button', { name: /change date card/i });
    // Same flex row as the eyebrow text — beside "AUG 17"-style eyebrow,
    // away from the card's right-edge '›' chevron.
    expect(trigger.parentElement).toContainElement(screen.getByText(/2026/i));
  });

  it('renders the switcher inside the liturgical card eyebrow row too', () => {
    mockSetting.current = { v: 1, type: 'liturgical', config: {} };
    renderSlot({ canManage: true, activeAddons: ['liturgy_planner'] });
    const trigger = screen.getByRole('button', { name: /change date card/i });
    expect(trigger.parentElement).toContainElement(screen.getByText(/today's liturgy/i));
  });

  it('disables add-on-gated types the tenant does not have', async () => {
    mockSetting.current = { v: 1, type: 'plain', config: {} };
    renderSlot({ canManage: true });
    openMenu();
    const item = (await screen.findByText('Liturgical day')).closest('[role="menuitemradio"]');
    expect(item).toHaveAttribute('data-disabled');
    expect(screen.getByText('Add-on required')).toBeInTheDocument();
  });
});
