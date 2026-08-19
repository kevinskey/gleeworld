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
// ReadingsModal (mounted closed inside the card) pulls the assistant-voice
// hook chain, which needs branding queries this test never exercises.
vi.mock('@/lib/assistant/voices', () => ({
  useAssistantVoice: () => ({ voiceId: null, loading: false }),
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
    // LiturgicalDayCard computes `today` via `new Date()` internally (it does not
    // read ctx.now), so we pin the real clock to the fixture instant with fake
    // timers rather than relying on the ambient calendar date lining up with
    // 'Saturday'. Scoped to this test only — the sibling test above awaits a
    // fetched promise via waitFor, which fake timers would otherwise stall.
    vi.useFakeTimers();
    vi.setSystemTime(ctx.now);
    try {
      const C = liturgicalCard.Render;
      render(<C config={liturgicalCard.defaultConfig} ctx={ctx} />);
      expect(screen.getByText('Saturday')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
