// @vitest-environment jsdom
//
// The keycap grid shows the same SET as the sidebar shelf (Kevin's ruling,
// see appDestinations.ts) — these hold it to showing the same STRUCTURE:
// loose keycaps first under no heading, then one heading per member-named
// group with its keycaps beneath, in view mode AND in edit mode.
//
// The edit-mode half matters most. The draft is a flat key list, so the
// bands have to be re-derived from it on every keystroke of an edit —
// otherwise a removed tile leaves a stale heading behind, and a tile added
// from More lands under whatever heading it happened to follow.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Music } from 'lucide-react';
import { HomeTileGrid } from './HomeTileGrid';
import type { Destination, TileBand } from '@/lib/navigation/appDestinations';

afterEach(cleanup);

const dest = (key: string): Destination => ({
  key, to: `/${key}`, label: key, icon: Music, section: 'music', tone: '',
});

const BANDS: TileBand[] = [
  { groupId: null, name: null, tiles: [dest('calendar'), dest('messages')] },
  { groupId: 'a', name: 'Sunday', tiles: [dest('liturgy')] },
  { groupId: 'b', name: 'Teaching', tiles: [dest('academy'), dest('grading')] },
];
const OVERFLOW = [dest('extra-a')];

function renderGrid(bands: TileBand[] = BANDS) {
  const onSave = vi.fn().mockResolvedValue(true);
  render(
    <MemoryRouter>
      <HomeTileGrid bands={bands} overflow={OVERFLOW} onSave={onSave} />
    </MemoryRouter>,
  );
  return { onSave };
}

const enterEditMode = () => fireEvent.click(screen.getByRole('button', { name: /edit apps/i }));
const headings = () => screen.getAllByRole('heading').map((h) => h.textContent);
// Edit mode labels every grid keycap "Remove <label> from grid", so this is
// the rendered order of the draft grid, bands included.
const gridOrder = () => screen.getAllByRole('button', { name: /^Remove .+ from grid$/ })
  .map((b) => b.getAttribute('aria-label')!.replace(/^Remove | from grid$/g, ''));

describe('HomeTileGrid grouped bands — view mode', () => {
  it('names the leading ungrouped band Favorites, then every named group', () => {
    renderGrid();
    expect(headings()).toEqual(['Favorites', 'Sunday', 'Teaching']);
  });

  it('renders loose keycaps first, then each band in order', () => {
    renderGrid();
    const keys = screen.getAllByRole('link').map((a) => a.textContent);
    expect(keys.slice(0, 5)).toEqual(['calendar', 'messages', 'liturgy', 'academy', 'grading']);
  });

  it('renders a band tile as a real link to its destination', () => {
    renderGrid();
    expect(screen.getByRole('link', { name: 'liturgy' })).toHaveAttribute('href', '/liturgy');
  });

  it('still says Favorites for a member with no groups at all', () => {
    renderGrid([{ groupId: null, name: null, tiles: [dest('calendar')] }]);
    expect(headings()).toEqual(['Favorites']);
  });

  it('shows no Favorites heading when the member has no ungrouped apps', () => {
    // A heading over nothing is noise in view mode — there is nothing to
    // drop and nothing to explain. Edit mode is where the empty row earns
    // its place; see the drop-zone test below.
    renderGrid([{ groupId: 'a', name: 'Sunday', tiles: [dest('liturgy')] }]);
    expect(headings()).toEqual(['Sunday']);
  });
});

describe('HomeTileGrid grouped bands — edit mode', () => {
  it('keeps the headings while editing', () => {
    renderGrid();
    enterEditMode();
    expect(headings()).toEqual(['Favorites', 'Sunday', 'Teaching']);
  });

  // Dragging the last favorite into a group would otherwise delete the row
  // and with it the only place to drop one back — a one-way door.
  it('keeps an empty Favorites row, as a drop target, while editing', () => {
    renderGrid([{ groupId: 'a', name: 'Sunday', tiles: [dest('liturgy')] }]);
    enterEditMode();
    expect(headings()).toEqual(['Favorites', 'Sunday']);
    expect(screen.getByText(/drag an app here/i)).toBeInTheDocument();
  });

  it('shows no drop-zone prompt once Favorites has apps in it', () => {
    renderGrid();
    enterEditMode();
    expect(screen.queryByText(/drag an app here/i)).toBeNull();
  });

  it('hands Done the flat loose-then-groups order', () => {
    const { onSave } = renderGrid();
    enterEditMode();
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onSave.mock.calls[0][0]).toEqual(['calendar', 'messages', 'liturgy', 'academy', 'grading']);
  });

  // Membership rides along with the order because a drag can now change it —
  // the caller re-splits loose/groups by THIS map, not by the stored filing.
  it('hands Done the band each tile ended up in', () => {
    const { onSave } = renderGrid();
    enterEditMode();
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onSave.mock.calls[0][1]).toEqual({
      calendar: null, messages: null, liturgy: 'a', academy: 'b', grading: 'b',
    });
  });

  it('re-derives the bands from the draft — a tile added from More joins the loose band', () => {
    const { onSave } = renderGrid();
    enterEditMode();
    fireEvent.click(screen.getByRole('button', { name: 'Add extra-a to grid' }));
    // Not appended after "grading" under the Teaching heading: it is ungrouped,
    // so it belongs in the leading loose band.
    expect(gridOrder()).toEqual(['calendar', 'messages', 'extra-a', 'liturgy', 'academy', 'grading']);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onSave.mock.calls[0][0]).toEqual(['calendar', 'messages', 'extra-a', 'liturgy', 'academy', 'grading']);
  });

  it('drops a heading the moment its last tile is removed mid-edit', () => {
    renderGrid();
    enterEditMode();
    fireEvent.click(screen.getByRole('button', { name: 'Remove liturgy from grid' }));
    expect(headings()).toEqual(['Favorites', 'Teaching']);
  });

  it('removing a grouped tile leaves every other band untouched on save', () => {
    const { onSave } = renderGrid();
    enterEditMode();
    fireEvent.click(screen.getByRole('button', { name: 'Remove academy from grid' }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onSave.mock.calls[0][0]).toEqual(['calendar', 'messages', 'liturgy', 'grading']);
  });

  it('shows no count, quota, or "full" state on any band', () => {
    renderGrid();
    enterEditMode();
    expect(screen.queryByText(/full/i)).toBeNull();
    expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
  });
});
