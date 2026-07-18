// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { upNextCard } from './upNext';
import { todayCard } from './today';
import type { DateCardContext } from '../types';

const ctx: DateCardContext = {
  now: new Date('2026-07-18T09:30:00'),
  firstName: 'Kevin',
  ensembleName: 'Concert Choir',
  upNext: { id: 'e1', title: 'Spring Concert', detail: 'Sisters Chapel', event_at: '2026-07-21T19:00:00' },
  todayRows: [
    { id: 't1', title: 'Sectional', detail: 'Room 214', event_at: '2026-07-18T14:00:00' },
    { id: 't2', title: 'Full Rehearsal', detail: null, event_at: '2026-07-18T16:00:00' },
  ],
};

afterEach(cleanup);

describe('up next card', () => {
  it('shows the next event title', () => {
    const C = upNextCard.Render;
    render(<C config={upNextCard.defaultConfig} ctx={ctx} />);
    expect(screen.getByText('Spring Concert')).toBeInTheDocument();
  });

  it('shows an empty state when nothing is scheduled', () => {
    const C = upNextCard.Render;
    render(<C config={upNextCard.defaultConfig} ctx={{ ...ctx, upNext: null }} />);
    expect(screen.getByText('Nothing scheduled')).toBeInTheDocument();
  });
});

describe('today card', () => {
  it('summarizes the number of items today', () => {
    const C = todayCard.Render;
    render(<C config={todayCard.defaultConfig} ctx={ctx} />);
    expect(screen.getByText('2 events today')).toBeInTheDocument();
  });

  it('uses the singular form for one item', () => {
    const C = todayCard.Render;
    render(<C config={todayCard.defaultConfig} ctx={{ ...ctx, todayRows: [ctx.todayRows[0]] }} />);
    expect(screen.getByText('1 event today')).toBeInTheDocument();
  });

  it('shows a clear day message when empty', () => {
    const C = todayCard.Render;
    render(<C config={todayCard.defaultConfig} ctx={{ ...ctx, todayRows: [] }} />);
    expect(screen.getByText('Clear day')).toBeInTheDocument();
  });
});
