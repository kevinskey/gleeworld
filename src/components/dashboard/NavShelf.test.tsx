// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavShelf, type NavShelfProps } from './NavShelf';
import { NAV_CATALOG, type CatalogEntry } from '@/lib/navigation/navCatalog';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const home = byKey.get('home')!;
const entry = (key: string) => byKey.get(key)!;
const tools = ['calendar', 'music-library', 'academy'].map((k) => byKey.get(k)!);

const renderShelf = (props: Partial<NavShelfProps> = {}) =>
  render(
    <MemoryRouter>
      <NavShelf
        home={home}
        tools={tools}
        onOpenAllTools={vi.fn()}
        variant="desktop"
        groups={[]}
        onToggleGroup={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );

describe('NavShelf', () => {
  it('renders Home first, then the tools in stored order', () => {
    renderShelf();
    const shelf = screen.getByTestId('nav-shelf-tools');
    const labels = within(shelf).getAllByRole('link').map((a) => a.textContent);
    expect(labels).toEqual(['Command Center', 'Calendar', 'Music Library', 'Academy']);
  });

  it('opens All Tools instead of expanding sections, and adds nothing inline anywhere in the shelf', () => {
    // NavShelf no longer takes a `sections` prop, so a `queryByText('Money')`
    // style assertion can never fail regardless of what this component does
    // — there is no code path left that could render section-header text at
    // all. The meaningful claim left to prove is behavioral: clicking All
    // Tools calls the caller's handler and mounts nothing new anywhere in
    // this component — which is what a reintroduced disclosure would do.
    //
    // Counted across the WHOLE render `container`, not scoped to
    // `within(shelf)` (the `nav-shelf-tools` sub-div) — the disclosure this
    // replaced rendered as a SIBLING of the All Tools button, OUTSIDE that
    // div (see the component's own JSX: the toggle and its disclosure sat
    // between the `nav-shelf-tools` div and the Setup row). A
    // `within(shelf)`-scoped count would not see a regression reintroduced
    // in that exact position — confirmed by a prior round's mutation, which
    // added a sibling disclosure there and left a `within(shelf)`-scoped
    // version of this assertion green.
    const onOpenAllTools = vi.fn();
    const { container } = renderShelf({ onOpenAllTools });
    const interactiveCountBefore = container.querySelectorAll('a, button').length;

    fireEvent.click(screen.getByRole('button', { name: /all tools/i }));

    expect(onOpenAllTools).toHaveBeenCalled();
    expect(container.querySelectorAll('a, button').length).toBe(interactiveCountBefore);
  });

  // The shelf used to .slice(0, 8) here. 8 is now the size a member STARTS
  // at, not a ceiling (product owner, 2026-08-09), so the shelf renders what
  // it is handed — hiding the 9th onward would make the member's own choice
  // invisible with nothing to explain it.
  it('renders every tool it is handed, well past eight, and does not truncate', () => {
    const many = NAV_CATALOG.filter((e) => e.key !== 'home').slice(0, 20);
    expect(many).toHaveLength(20); // guard: the fixture really is > 8
    renderShelf({ tools: many });
    const shelf = screen.getByTestId('nav-shelf-tools');
    // Home + all 20.
    expect(within(shelf).getAllByRole('link')).toHaveLength(21);
    // Named, not just counted: the 20th must actually be on screen.
    expect(within(shelf).getByText(many[19].label)).toBeInTheDocument();
  });

  it('still drops a tool duplicating the Home row, however long the shelf is', () => {
    const many = NAV_CATALOG.slice(0, 20); // includes 'home'
    renderShelf({ tools: many });
    const shelf = screen.getByTestId('nav-shelf-tools');
    // 'home' appears once (the dedicated Home row), not twice.
    expect(within(shelf).getAllByText('Command Center')).toHaveLength(1);
  });

  it('degrades to no Home row when home is absent, tools and All Tools still render', () => {
    // I2: 'home' can be hidden via Workspace Settings → Navigation. NavShelf
    // must not blank the whole nav for that — the shelf renders every other
    // tool, and the All Tools row still opens the sheet.
    const onOpenAllTools = vi.fn();
    renderShelf({ home: undefined, onOpenAllTools });
    const shelf = screen.getByTestId('nav-shelf-tools');
    const labels = within(shelf).getAllByRole('link').map((a) => a.textContent);
    expect(labels).toEqual(['Calendar', 'Music Library', 'Academy']);
    expect(within(shelf).queryByText('Command Center')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /all tools/i }));
    expect(onOpenAllTools).toHaveBeenCalled();
  });

  it('renders no drag affordance — reordering is not a shelf gesture', () => {
    const { container } = renderShelf();
    // dnd-kit's useSortable stamps aria-roledescription="sortable" and the
    // old sidebar rows carried cursor-grab. Both must be absent — this is
    // the regression guard against the retired sortable sidebar.
    expect(container.querySelectorAll('[aria-roledescription="sortable"]')).toHaveLength(0);
    expect(container.querySelectorAll('.cursor-grab')).toHaveLength(0);

    // The component imports no dnd-kit, so those two selectors can only ever
    // catch a copy-paste of the old sidebar. Also rule out a hand-rolled
    // drag affordance: no draggable elements, and nothing styled with an
    // inline grab/grabbing cursor.
    expect(container.querySelectorAll('[draggable="true"]')).toHaveLength(0);
    const grabCursorElements = Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
      (el) => el.style.cursor === 'grab' || el.style.cursor === 'grabbing',
    );
    expect(grabCursorElements).toHaveLength(0);
  });

  it('renders a Setup row linking to My World', () => {
    renderShelf();
    const link = screen.getByRole('link', { name: /setup/i });
    expect(link).toHaveAttribute('href', '/dashboard/my-world');
  });

  it('marks the All Tools button as opening a dialog', () => {
    renderShelf();
    expect(screen.getByRole('button', { name: /all tools/i })).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('places Setup after the All Tools row, not before it', () => {
    const { container } = renderShelf();
    const order = Array.from(container.querySelectorAll('a, button')).map((el) => el.textContent);
    const allToolsIdx = order.indexOf('All Tools');
    const setupIdx = order.indexOf('Setup');
    expect(allToolsIdx).toBeGreaterThan(-1);
    expect(setupIdx).toBeGreaterThan(allToolsIdx);
  });
});

const groupOf = (name: string, entries: CatalogEntry[], collapsed = false) =>
  ({ id: name.toLowerCase(), name, entries, collapsed });

describe('NavShelf — groups', () => {
  it('renders loose tools above every group header', () => {
    renderShelf({
      tools: [entry('calendar'), entry('messages')],
      groups: [groupOf('Sunday', [entry('liturgy')])],
    });
    const rows = screen.getByTestId('nav-shelf-tools').textContent ?? '';
    expect(rows.indexOf('Calendar')).toBeLessThan(rows.indexOf('Sunday'));
  });

  it('renders a group header and its members when expanded', () => {
    renderShelf({ tools: [], groups: [groupOf('Sunday', [entry('liturgy')])] });
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Liturgy Planner')).toBeInTheDocument();
  });

  it('hides members when collapsed, with no count badge (removed 2026-08-17)', () => {
    renderShelf({ tools: [], groups: [groupOf('Sunday', [entry('liturgy')], true)] });
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.queryByText('Liturgy Planner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-group-count-sunday')).not.toBeInTheDocument();
  });

  it('reports a collapse toggle to its caller', () => {
    const onToggleGroup = vi.fn();
    renderShelf({ tools: [], groups: [groupOf('Sunday', [entry('liturgy')])], onToggleGroup });
    fireEvent.click(screen.getByRole('button', { name: /Sunday/ }));
    expect(onToggleGroup).toHaveBeenCalledWith('sunday', true);
  });

  it('renders exactly the flat shelf when there are no groups', () => {
    renderShelf({ tools: [entry('calendar')], groups: [] });
    expect(screen.queryByTestId(/nav-group-/)).not.toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});
