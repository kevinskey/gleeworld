// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MyWorldEditor, type MyWorldEditorProps } from './MyWorldEditor';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';
import { HOME_WIDGETS, widgetsFor } from '@/lib/navigation/homeWidgets';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const available = ['calendar', 'messages', 'music-library', 'academy', 'finance', 'studio']
  .map((k) => byKey.get(k)!);
// A wider pool, so a test can push the chosen set past eight and still have
// an un-chosen entry left to press ⊕ on.
const allAvailable = [
  'calendar', 'messages', 'music-library', 'academy', 'finance', 'studio',
  'people', 'part-tracks', 'sight', 'my-fees', 'video', 'planner',
].map((k) => byKey.get(k)!);

const renderEditor = (props: Partial<MyWorldEditorProps> = {}) => {
  const onToolsChange = vi.fn();
  const utils = render(
    <MyWorldEditor
      available={available}
      tools={['calendar', 'academy']}
      onToolsChange={onToolsChange}
      {...props}
    />,
  );
  return { ...utils, onToolsChange };
};

describe('MyWorldEditor — chosen list', () => {
  it('lists chosen tools in stored order, not catalog order', () => {
    renderEditor({ tools: ['academy', 'calendar'] });
    const group = screen.getByTestId('my-world-chosen');
    expect(within(group).getAllByRole('listitem').map((li) => li.textContent))
      .toEqual(expect.arrayContaining([expect.stringContaining('Academy'), expect.stringContaining('Calendar')]));
    expect(within(group).getAllByRole('listitem')[0]).toHaveTextContent('Academy');
  });

  // A plain count, not "n of 8": 8 is a starting size, not a ceiling, so
  // there is no denominator to report. EXACT match — jest-dom's
  // toHaveTextContent with a string is a substring match, and '2 tools'
  // would happily pass against a regressed '2 tools of 8'.
  it('shows a plain tool count, with no denominator', () => {
    renderEditor({ tools: ['calendar', 'academy'] });
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^2 tools$/);
  });

  it('says "1 tool", not "1 tools"', () => {
    renderEditor({ tools: ['calendar'] });
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^1 tool$/);
  });

  it('removing emits the list without that key, order otherwise intact', () => {
    const { onToolsChange } = renderEditor({ tools: ['calendar', 'academy', 'finance'] });
    fireEvent.click(screen.getByRole('button', { name: /remove academy/i }));
    expect(onToolsChange).toHaveBeenCalledWith(['calendar', 'finance']);
  });

  it('captions the card with the always-present Home row (spec §5.4)', () => {
    renderEditor();
    expect(screen.getByText('Home is always here.')).toBeInTheDocument();
  });

  // Final review, Important 1: a stored key that has dropped out of
  // `available` (tenant switched the module off, role gate closed, key
  // retired) still counts against the cap — the counter and `atCap` both
  // read the stored record. Rendering rows only for resolvable entries left
  // a member on "8 of 8 — your space is full" above four visible rows, with
  // every ⊕ disabled and no ⊖ for the four they cannot see. My Space is the
  // ONLY surface that can clear such a key (HouseHome's mergeGridOrder
  // deliberately carries it through untouched), so with no row there was no
  // exit: that member could never add another tool again.
  describe('stored keys with no catalog entry', () => {
    const stored = [
      'calendar', 'ghost-a', 'messages', 'ghost-b',
      'academy', 'ghost-c', 'finance', 'ghost-d',
    ];
    const ghosts = ['ghost-a', 'ghost-b', 'ghost-c', 'ghost-d'];

    it('renders one row per STORED key, marking the unresolvable ones unavailable', () => {
      renderEditor({ tools: stored });
      const group = screen.getByTestId('my-world-chosen');
      expect(within(group).getAllByRole('listitem')).toHaveLength(8);
      expect(within(group).getAllByTestId('my-world-unavailable')).toHaveLength(4);
      // The key is all there is to show — the catalog entry is gone.
      expect(within(group).getAllByText('Unavailable')).toHaveLength(4);
      for (const k of ghosts) expect(within(group).getByText(k)).toBeInTheDocument();
      expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^8 tools$/);
    });

    it('gives every unavailable row a live ⊖ so the member can free the slot', () => {
      const { onToolsChange } = renderEditor({ tools: stored });
      for (const k of ghosts) {
        const btn = screen.getByRole('button', { name: new RegExp(`^remove unavailable tool ${k}$`, 'i') });
        expect(btn).toBeEnabled();
        fireEvent.click(btn);
        expect(onToolsChange).toHaveBeenLastCalledWith(stored.filter((x) => x !== k));
      }
    });

    it('gives an unavailable row no drag handle — there is nothing to arrange', () => {
      renderEditor({ tools: stored });
      // Guard against passing by absence: the row itself must be there.
      expect(within(screen.getByTestId('my-world-chosen')).getByText('ghost-a')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reorder ghost-a/i })).toBeNull();
      expect(screen.getByRole('button', { name: /reorder calendar/i })).toBeInTheDocument();
    });
  });
});

describe('MyWorldEditor — available list', () => {
  it('offers only tools not already chosen', () => {
    renderEditor({ tools: ['calendar'] });
    const more = screen.getByTestId('my-world-more');
    expect(within(more).queryByText('Calendar')).toBeNull();
    expect(within(more).getByText('Academy')).toBeInTheDocument();
  });

  it('adding appends to the end so nothing already placed moves', () => {
    const { onToolsChange } = renderEditor({ tools: ['calendar', 'academy'] });
    fireEvent.click(screen.getByRole('button', { name: /add finance/i }));
    expect(onToolsChange).toHaveBeenCalledWith(['calendar', 'academy', 'finance']);
  });

  // The product owner's call, 2026-08-09: 8 is where a member STARTS, not a
  // ceiling. Adding a ninth tool is ordinary use — no disabled ⊕, no "your
  // world is full" banner, no silent no-op.
  it('keeps adding past the eighth tool — 8 is a starting size, not a cap', () => {
    // Six distinct available entries; six chosen + two ghosts = eight stored.
    const eight = [...available.map((e) => e.key), 'ghost-a', 'ghost-b'];
    const { onToolsChange } = renderEditor({ tools: eight, available: allAvailable });
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^8 tools$/);
    const ninth = screen.getByRole('button', { name: /^add people$/i });
    expect(ninth).toBeEnabled();
    fireEvent.click(ninth);
    expect(onToolsChange).toHaveBeenCalledWith([...eight, 'people']);
  });

  it('shows no "full" affordance at any length', () => {
    renderEditor({ tools: allAvailable.map((e) => e.key), available: allAvailable });
    expect(screen.queryByTestId('my-world-full')).toBeNull();
    expect(screen.queryByText(/full/i)).toBeNull();
  });

  it('groups available tools under their section label', () => {
    renderEditor({ tools: [] });
    const more = screen.getByTestId('my-world-more');
    expect(within(more).getByText('Money')).toBeInTheDocument();
  });
});

describe('MyWorldEditor — widgets', () => {
  it('is absent when no widget options are given', () => {
    renderEditor();
    expect(screen.queryByTestId('my-world-widgets')).toBeNull();
  });

  it('toggles a widget on and caps the selection at two', () => {
    const onWidgetsChange = vi.fn();
    const opts = widgetsFor('faculty');
    render(
      <MyWorldEditor
        available={available}
        tools={[]}
        onToolsChange={vi.fn()}
        widgetOptions={opts}
        widgets={[opts[0].key]}
        onWidgetsChange={onWidgetsChange}
      />,
    );
    expect(screen.getByTestId('my-world-widget-count')).toHaveTextContent('1 of 2');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(opts[1].label, 'i') }));
    expect(onWidgetsChange).toHaveBeenCalledWith([opts[0].key, opts[1].key]);
  });

  it('deselects a chosen widget', () => {
    const onWidgetsChange = vi.fn();
    const opts = widgetsFor('faculty');
    render(
      <MyWorldEditor
        available={available}
        tools={[]}
        onToolsChange={vi.fn()}
        widgetOptions={opts}
        widgets={[opts[0].key, opts[1].key]}
        onWidgetsChange={onWidgetsChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: new RegExp(opts[0].label, 'i') }));
    expect(onWidgetsChange).toHaveBeenCalledWith([opts[1].key]);
  });

  // Final review, Minor 4: unchecking the last widget stores [], and
  // resolveWidgets([]) re-expands an empty pick to both role defaults, so
  // the checkbox snapped straight back on — a control that looks broken.
  it('locks the last remaining widget rather than letting it snap back on', () => {
    const onWidgetsChange = vi.fn();
    const opts = widgetsFor('faculty');
    render(
      <MyWorldEditor
        available={available}
        tools={[]}
        onToolsChange={vi.fn()}
        widgetOptions={opts}
        widgets={[opts[0].key]}
        onWidgetsChange={onWidgetsChange}
      />,
    );
    const last = screen.getByRole('button', { name: new RegExp(opts[0].label, 'i') });
    expect(last).toBeDisabled();
    fireEvent.click(last);
    expect(onWidgetsChange).not.toHaveBeenCalled();
    // The unchecked one stays available — only the LAST checked is locked.
    expect(screen.getByRole('button', { name: new RegExp(opts[1].label, 'i') })).toBeEnabled();
  });
});

// Final review, Minor 1: the previous version of this block only clicked a
// button that was already `disabled` — a no-op in jsdom whether or not the
// `if (disabled) return` guards exist, so it passed vacuously. `disabled`
// is the first-run sheet's ONLY edit lock while the member's record loads,
// so it has to actually bite: assert the attribute on every control.
describe('MyWorldEditor — disabled', () => {
  const renderDisabled = () => {
    const onToolsChange = vi.fn();
    const onWidgetsChange = vi.fn();
    const opts = widgetsFor('faculty');
    render(
      <MyWorldEditor
        available={available}
        tools={['calendar', 'academy']}
        onToolsChange={onToolsChange}
        widgetOptions={opts}
        widgets={[opts[0].key, opts[1].key]}
        onWidgetsChange={onWidgetsChange}
        disabled
      />,
    );
    return { onToolsChange, onWidgetsChange, opts };
  };

  it('disables the ⊖, the drag handle, every ⊕, and every widget toggle', () => {
    const { opts } = renderDisabled();
    expect(screen.getByRole('button', { name: /^remove calendar$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^reorder calendar$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^add finance$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^add studio$/i })).toBeDisabled();
    for (const opt of opts) {
      expect(screen.getByRole('button', { name: new RegExp(`^${opt.label}$`, 'i') })).toBeDisabled();
    }
  });

  it('emits nothing when any of them is driven anyway', () => {
    const { onToolsChange, onWidgetsChange, opts } = renderDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^remove calendar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^add finance$/i }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${opts[0].label}$`, 'i') }));
    expect(onToolsChange).not.toHaveBeenCalled();
    expect(onWidgetsChange).not.toHaveBeenCalled();
  });
});

describe('MyWorldEditor — accessibility', () => {
  it('gives every action button an accessible name', () => {
    renderEditor();
    for (const b of screen.getAllByRole('button')) {
      expect(b).toHaveAccessibleName();
    }
  });
});
