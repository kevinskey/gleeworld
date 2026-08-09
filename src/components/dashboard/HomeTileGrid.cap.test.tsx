// @vitest-environment jsdom
//
// I2 (final review): the grid's add path had no ceiling. A member could pin
// every enabled destination, the layout would be written, and sanitizeTools
// would then silently drop everything past MY_TOOLS_CAP on save — the exact
// "zero silent drops" the plan's acceptance test #2 promises. The cap now
// lives where the member can see it: the tap is refused, out loud.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Music } from 'lucide-react';
import { HomeTileGrid } from './HomeTileGrid';
import { MY_TOOLS_CAP } from '@/lib/navigation/myTools';
import type { Destination } from '@/lib/navigation/appDestinations';

afterEach(cleanup);

const dest = (key: string): Destination => ({
  key, to: `/${key}`, label: key, icon: Music, section: 'music', tone: '',
});

const eight = Array.from({ length: MY_TOOLS_CAP }, (_, i) => dest(`p${i}`));
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

describe('HomeTileGrid add cap', () => {
  it('refuses a 9th tile and says why, instead of silently ignoring the tap', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    // Still in More (not promoted), and never rendered as a removable tile.
    expect(screen.getByRole('button', { name: 'Add extra-a to grid' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove extra-a from grid' })).toBeNull();
    expect(screen.getByText(new RegExp(`Grid is full \\(${MY_TOOLS_CAP}\\)`))).toBeInTheDocument();
  });

  it('accepts the tile once the member removes one first', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Remove p0 from grid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    expect(screen.getByRole('button', { name: 'Remove extra-a from grid' })).toBeInTheDocument();
  });

  it('honours a lowered cap — stored keys the grid cannot show still own their slots', () => {
    // HouseHome passes MY_TOOLS_CAP minus the stored keys with no keycap (on
    // a phone the tab bar claims Home/Messages/Calendar). Without that, the
    // merged record could exceed the cap and sanitizeTools would truncate.
    render(
      <MemoryRouter>
        <HomeTileGrid primary={eight.slice(0, 6)} overflow={spare} cap={6} onSave={vi.fn()} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /edit apps/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    expect(screen.queryByRole('button', { name: 'Remove extra-a from grid' })).toBeNull();
    expect(screen.getByText(/Grid is full \(6\)/)).toBeInTheDocument();
  });

  it('saves only what fits — Done never hands the caller an oversized order', () => {
    const { onSave } = renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-b to grid' }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onSave).toHaveBeenCalledWith(eight.map((d) => d.key));
  });
});
