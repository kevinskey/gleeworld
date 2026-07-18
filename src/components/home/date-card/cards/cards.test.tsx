// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { plainCard } from './plain';
import { customCard } from './custom';
import { getDateCardModule, DEFAULT_DATE_CARD_TYPE } from '../registry';
import type { DateCardContext } from '../types';

const ctx: DateCardContext = {
  now: new Date('2026-07-18T09:30:00'),
  firstName: 'Kevin',
  ensembleName: 'Concert Choir',
  upNext: { id: 'e1', title: 'Spring Concert', detail: 'Sisters Chapel', event_at: '2026-07-21T19:00:00' },
  todayRows: [],
};

const ctxNoUpNext: DateCardContext = {
  ...ctx,
  upNext: null,
};

afterEach(cleanup);

describe('plain card', () => {
  it('renders the weekday as the title', () => {
    const C = plainCard.Render;
    render(<C config={plainCard.defaultConfig} ctx={ctx} />);
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('renders the formatted date as the eyebrow', () => {
    const C = plainCard.Render;
    render(<C config={plainCard.defaultConfig} ctx={ctx} />);
    expect(screen.getByText('Jul 18, 2026')).toBeInTheDocument();
  });
});

describe('registration', () => {
  it('resolves the default type once cards are registered', () => {
    expect(getDateCardModule(DEFAULT_DATE_CARD_TYPE)).toBeDefined();
  });

  it('registers the custom card', () => {
    expect(getDateCardModule('custom')).toBeDefined();
  });
});

describe('custom card', () => {
  it('substitutes tokens in every field', () => {
    const C = customCard.Render;
    render(<C config={{ eyebrow: '{{date}}', title: '{{next_event}}', subtitle: '{{ensemble_name}}' }} ctx={ctx} />);
    expect(screen.getByText('Saturday, July 18, 2026')).toBeInTheDocument();
    expect(screen.getByText('Spring Concert')).toBeInTheDocument();
    expect(screen.getByText('Concert Choir')).toBeInTheDocument();
  });

  it('renders markup as literal text, never as HTML', () => {
    const C = customCard.Render;
    const { container } = render(
      <C config={{ eyebrow: '', title: '<img src=x onerror=alert(1)>', subtitle: '' }} ctx={ctx} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });

  it('falls back to the weekday when the title is empty', () => {
    const C = customCard.Render;
    render(<C config={{ eyebrow: '', title: '', subtitle: '' }} ctx={ctx} />);
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('falls back to the weekday when the title is an unresolved {{next_event}} placeholder and there is no upcoming event', () => {
    const C = customCard.Render;
    render(<C config={{ eyebrow: '', title: '{{next_event}}', subtitle: '' }} ctx={ctxNoUpNext} />);
    expect(screen.getByText('Saturday')).toBeInTheDocument();
    expect(screen.queryByText('{{next_event}}')).not.toBeInTheDocument();
  });

  it('renders the event title instead of falling back when upNext is present', () => {
    const C = customCard.Render;
    render(<C config={{ eyebrow: '', title: '{{next_event}}', subtitle: '' }} ctx={ctx} />);
    expect(screen.getByText('Spring Concert')).toBeInTheDocument();
    expect(screen.queryByText('Saturday')).not.toBeInTheDocument();
  });

  it('renders mixed content literally, including the unresolved placeholder, without falling back', () => {
    const C = customCard.Render;
    render(<C config={{ eyebrow: '', title: 'Concert {{next_event}}', subtitle: '' }} ctx={ctxNoUpNext} />);
    expect(screen.getByText('Concert {{next_event}}')).toBeInTheDocument();
    expect(screen.queryByText('Saturday')).not.toBeInTheDocument();
  });

  it('falls back to the weekday when the title is whitespace-only', () => {
    const C = customCard.Render;
    render(<C config={{ eyebrow: '', title: '   ', subtitle: '' }} ctx={ctx} />);
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });
});
