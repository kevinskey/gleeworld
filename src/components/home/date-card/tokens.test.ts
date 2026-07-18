import { describe, it, expect } from 'vitest';
import { substituteText } from '@/lib/planner/templates';
import { dateCardTokenContext } from './tokens';
import type { DateCardContext } from './types';

const baseCtx: DateCardContext = {
  now: new Date('2026-07-18T09:30:00'),
  firstName: 'Kevin',
  ensembleName: 'Concert Choir',
  upNext: { id: 'e1', title: 'Spring Concert', detail: 'Sisters Chapel', event_at: '2026-07-21T19:00:00' },
  todayRows: [],
};

describe('dateCardTokenContext', () => {
  it('supplies event tokens from upNext', () => {
    const t = dateCardTokenContext(baseCtx);
    expect(t.next_event).toBe('Spring Concert');
    expect(t.next_event_date).toBe('Tue, Jul 21');
  });

  it('supplies identity tokens', () => {
    const t = dateCardTokenContext(baseCtx);
    expect(t.user_name).toBe('Kevin');
    expect(t.ensemble_name).toBe('Concert Choir');
  });

  it('omits event tokens when nothing is upcoming', () => {
    const t = dateCardTokenContext({ ...baseCtx, upNext: null });
    expect(t.next_event).toBeUndefined();
  });

  it('substitutes into a template string', () => {
    const out = substituteText('{{next_event}} · {{ensemble_name}}', dateCardTokenContext(baseCtx));
    expect(out).toBe('Spring Concert · Concert Choir');
  });

  it('leaves unknown tokens visible so typos are obvious', () => {
    const out = substituteText('Week {{term_week}}', dateCardTokenContext(baseCtx));
    expect(out).toBe('Week {{term_week}}');
  });

  it('leaves an unprovided known token visible rather than blanking it', () => {
    const out = substituteText('{{next_event}}', dateCardTokenContext({ ...baseCtx, upNext: null }));
    expect(out).toBe('{{next_event}}');
  });
});
