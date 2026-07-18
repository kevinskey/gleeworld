// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { liturgicalCard } from './liturgical';
import type { DateCardContext } from '../types';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => ({ data: { liturgicalTitle: 'Sixteenth Sunday in Ordinary Time' } })),
    },
  },
}));

const ctx: DateCardContext = {
  now: new Date('2026-07-18T09:30:00'),
  firstName: 'Kevin',
  ensembleName: 'Concert Choir',
  upNext: null,
  todayRows: [],
};

afterEach(cleanup);

describe('liturgical card', () => {
  it('requires the liturgy_planner add-on', () => {
    expect(liturgicalCard.requiredAddon).toBe('liturgy_planner');
  });

  it('renders the fetched liturgical title', async () => {
    const C = liturgicalCard.Render;
    render(<C config={liturgicalCard.defaultConfig} ctx={ctx} />);
    await waitFor(() => {
      expect(screen.getByText('Sixteenth Sunday in Ordinary Time')).toBeInTheDocument();
    });
  });

  it('falls back to the weekday before the title resolves', () => {
    const C = liturgicalCard.Render;
    render(<C config={liturgicalCard.defaultConfig} ctx={ctx} />);
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });
});
