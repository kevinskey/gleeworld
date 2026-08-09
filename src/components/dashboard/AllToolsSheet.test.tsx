// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { AllToolsSheet, type AllToolsSheetProps } from './AllToolsSheet';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const available = ['academy', 'finance', 'seating-charts', 'music-library', 'studio']
  .map((k) => byKey.get(k)!);

const renderSheet = (props: Partial<AllToolsSheetProps> = {}) => {
  const onPin = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  const utils = render(
    <MemoryRouter>
      <AllToolsSheet open onOpenChange={onOpenChange} available={available} pinned={[]} onPin={onPin} {...props} />
    </MemoryRouter>,
  );
  return { ...utils, onPin, onOpenChange };
};

beforeEach(() => vi.clearAllMocks());

describe('AllToolsSheet — browsing', () => {
  it('groups by section when there is no query', () => {
    renderSheet();
    expect(screen.getByText('Money')).toBeInTheDocument();
    expect(screen.getByText('Teach')).toBeInTheDocument();
  });

  it('offers every entry it was given', () => {
    renderSheet();
    for (const e of available) expect(screen.getByText(e.label)).toBeInTheDocument();
  });
});

describe('AllToolsSheet — search', () => {
  it('finds Seating Charts by prefix', async () => {
    renderSheet();
    fireEvent.change(screen.getByPlaceholderText(/search all tools/i), { target: { value: 'seat' } });
    await waitFor(() => expect(screen.getByText('Seating Charts')).toBeInTheDocument());
    expect(screen.queryByText('Academy')).toBeNull();
  });

  it('shows an empty state when nothing matches', async () => {
    renderSheet();
    fireEvent.change(screen.getByPlaceholderText(/search all tools/i), { target: { value: 'zzzzz' } });
    await waitFor(() => expect(screen.getByText(/no tools match that/i)).toBeInTheDocument());
  });
});

describe('AllToolsSheet — pinning', () => {
  it('pins without navigating or closing', async () => {
    const { onPin, onOpenChange } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: /pin academy to your space/i }));
    await waitFor(() => expect(onPin).toHaveBeenCalledWith('academy'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('marks already-pinned entries and offers no pin button for them', () => {
    renderSheet({ pinned: ['academy'] });
    expect(screen.queryByRole('button', { name: /pin academy to your space/i })).toBeNull();
    expect(screen.getByText(/in your space/i)).toBeInTheDocument();
  });

  it('disables pinning at the cap and says why', () => {
    renderSheet({ pinned: NAV_CATALOG.slice(0, 8).map((e) => e.key) });
    expect(screen.getByText(/your space is full/i)).toBeInTheDocument();
    const btn = screen.queryByRole('button', { name: /pin finance to your space/i });
    if (btn) expect(btn).toBeDisabled();
  });
});

describe('AllToolsSheet — accessibility', () => {
  it('gives every button an accessible name', () => {
    renderSheet();
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAccessibleName();
  });
});
