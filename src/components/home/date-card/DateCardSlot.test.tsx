// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { DateCardContext } from './types';

const mockSetting = vi.hoisted(() => ({ current: { v: 1, type: 'plain', config: {} } }));

vi.mock('@/hooks/useDateCardConfig', () => ({
  useDateCardConfig: () => ({ setting: mockSetting.current, loading: false, save: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: {} })) } },
}));

import { DateCardSlot } from './DateCardSlot';

const ctx: DateCardContext = {
  now: new Date('2026-07-18T09:30:00'),
  firstName: 'Kevin',
  ensembleName: 'Concert Choir',
  upNext: null,
  todayRows: [],
};

afterEach(cleanup);

describe('DateCardSlot', () => {
  it('renders the configured card', () => {
    mockSetting.current = { v: 1, type: 'today', config: {} };
    render(<DateCardSlot ctx={ctx} activeAddons={[]} />);
    expect(screen.getByText('Clear day')).toBeInTheDocument();
  });

  it('falls back to plain when the required add-on is missing', () => {
    mockSetting.current = { v: 1, type: 'liturgical', config: {} };
    render(<DateCardSlot ctx={ctx} activeAddons={[]} />);
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('renders the liturgical card when the add-on is active', () => {
    mockSetting.current = { v: 1, type: 'liturgical', config: {} };
    render(<DateCardSlot ctx={ctx} activeAddons={['liturgy_planner']} />);
    expect(screen.queryByText('Clear day')).not.toBeInTheDocument();
  });

  it('falls back to plain for an unknown type', () => {
    mockSetting.current = { v: 1, type: 'from-the-future', config: {} };
    render(<DateCardSlot ctx={ctx} activeAddons={[]} />);
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });
});
