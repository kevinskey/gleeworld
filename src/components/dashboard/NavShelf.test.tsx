// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavShelf, type NavShelfProps } from './NavShelf';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const home = byKey.get('home')!;
const tools = ['calendar', 'music-library', 'academy'].map((k) => byKey.get(k)!);
const sections = [
  { key: 'money', label: 'Money', items: [byKey.get('finance')!] },
  { key: 'admin', label: 'Admin', items: [byKey.get('settings')!] },
];

const renderShelf = (props: Partial<NavShelfProps> = {}) =>
  render(
    <MemoryRouter>
      <NavShelf home={home} tools={tools} sections={sections} variant="desktop" {...props} />
    </MemoryRouter>,
  );

describe('NavShelf', () => {
  it('renders Home first, then the tools in stored order', () => {
    renderShelf();
    const shelf = screen.getByTestId('nav-shelf-tools');
    const labels = within(shelf).getAllByRole('link').map((a) => a.textContent);
    expect(labels).toEqual(['Command Center', 'Calendar', 'Music Library', 'Academy']);
  });

  it('does not render section headers on the shelf itself', () => {
    renderShelf();
    const shelf = screen.getByTestId('nav-shelf-tools');
    expect(within(shelf).queryByText('Money')).toBeNull();
  });

  it('hides every non-shelf destination until All Tools is opened', () => {
    renderShelf();
    expect(screen.queryByText('Finance')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /all tools/i }));
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Money')).toBeInTheDocument();
  });

  it('caps the shelf at Home + 8 tools even if handed more', () => {
    const many = NAV_CATALOG.filter((e) => e.key !== 'home').slice(0, 20);
    renderShelf({ tools: many });
    const shelf = screen.getByTestId('nav-shelf-tools');
    expect(within(shelf).getAllByRole('link')).toHaveLength(9);
  });

  it('renders no drag affordance — reordering is not a shelf gesture', () => {
    const { container } = renderShelf();
    // dnd-kit's useSortable stamps aria-roledescription="sortable" and the
    // old sidebar rows carried cursor-grab. Both must be absent.
    expect(container.querySelectorAll('[aria-roledescription="sortable"]')).toHaveLength(0);
    expect(container.querySelectorAll('.cursor-grab')).toHaveLength(0);
  });
});
