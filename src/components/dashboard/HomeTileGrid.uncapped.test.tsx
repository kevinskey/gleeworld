// @vitest-environment jsdom
//
// The grid's add path used to refuse a tap once the draft reached a `cap`
// prop (MY_TOOLS_CAP, which HouseHome lowered for stored keys with no
// keycap), because sanitizeTools would otherwise silently drop the tail on
// save. The product owner removed the 8-tool ceiling on 2026-08-09: 8 is
// what a member STARTS with, and sanitizeTools no longer truncates there
// (see MY_TOOLS_SANITY_MAX in myTools.ts). So there is nothing left to
// protect the member from, and these tests hold the ceiling GONE — a
// reinstated cap, in the component or via a resurrected `cap` prop, turns
// them red.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Music } from 'lucide-react';
import { HomeTileGrid } from './HomeTileGrid';
import { MY_TOOLS_SEED_SIZE } from '@/lib/navigation/myTools';
import type { Destination } from '@/lib/navigation/appDestinations';

afterEach(cleanup);

const dest = (key: string): Destination => ({
  key, to: `/${key}`, label: key, icon: Music, section: 'music', tone: '',
});

const eight = Array.from({ length: MY_TOOLS_SEED_SIZE }, (_, i) => dest(`p${i}`));
const spare = [dest('extra-a'), dest('extra-b')];

function renderGrid(props: Partial<React.ComponentProps<typeof HomeTileGrid>> = {}) {
  const onSave = vi.fn().mockResolvedValue(true);
  render(
    <MemoryRouter>
      <HomeTileGrid primary={eight} overflow={spare} onSave={onSave} {...props} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /edit apps/i }));
  return { onSave };
}

describe('HomeTileGrid has no add ceiling', () => {
  it('promotes a 9th tile instead of refusing the tap', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    // Promoted: it is now a removable primary tile, no longer an addable one.
    expect(screen.getByRole('button', { name: 'Remove extra-a from grid' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add extra-a to grid' })).toBeNull();
  });

  it('shows no "grid is full" affordance once past eight', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    expect(screen.queryByText(/grid is full/i)).toBeNull();
  });

  it('hands Done the FULL oversized order — nothing is dropped on save', () => {
    const { onSave } = renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-b to grid' }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    // All ten, in order — not the first eight.
    expect(onSave).toHaveBeenCalledWith([...eight, ...spare].map((d) => d.key));
  });

  it('still refuses to add the same tile twice', () => {
    // The dedupe guard is separate from the retired cap and must survive it.
    const { onSave } = renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onSave).toHaveBeenCalledWith([...eight.map((d) => d.key), 'extra-a']);
  });
});
