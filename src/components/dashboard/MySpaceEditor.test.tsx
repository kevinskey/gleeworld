// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MySpaceEditor, type MySpaceEditorProps } from './MySpaceEditor';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';
import { HOME_WIDGETS, widgetsFor } from '@/lib/navigation/homeWidgets';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const available = ['calendar', 'messages', 'music-library', 'academy', 'finance', 'studio']
  .map((k) => byKey.get(k)!);

const renderEditor = (props: Partial<MySpaceEditorProps> = {}) => {
  const onToolsChange = vi.fn();
  const utils = render(
    <MySpaceEditor
      available={available}
      tools={['calendar', 'academy']}
      onToolsChange={onToolsChange}
      {...props}
    />,
  );
  return { ...utils, onToolsChange };
};

describe('MySpaceEditor — chosen list', () => {
  it('lists chosen tools in stored order, not catalog order', () => {
    renderEditor({ tools: ['academy', 'calendar'] });
    const group = screen.getByTestId('my-space-chosen');
    expect(within(group).getAllByRole('listitem').map((li) => li.textContent))
      .toEqual(expect.arrayContaining([expect.stringContaining('Academy'), expect.stringContaining('Calendar')]));
    expect(within(group).getAllByRole('listitem')[0]).toHaveTextContent('Academy');
  });

  it('shows an n-of-8 counter', () => {
    renderEditor({ tools: ['calendar', 'academy'] });
    expect(screen.getByTestId('my-space-count')).toHaveTextContent('2 of 8');
  });

  it('removing emits the list without that key, order otherwise intact', () => {
    const { onToolsChange } = renderEditor({ tools: ['calendar', 'academy', 'finance'] });
    fireEvent.click(screen.getByRole('button', { name: /remove academy/i }));
    expect(onToolsChange).toHaveBeenCalledWith(['calendar', 'finance']);
  });
});

describe('MySpaceEditor — available list', () => {
  it('offers only tools not already chosen', () => {
    renderEditor({ tools: ['calendar'] });
    const more = screen.getByTestId('my-space-more');
    expect(within(more).queryByText('Calendar')).toBeNull();
    expect(within(more).getByText('Academy')).toBeInTheDocument();
  });

  it('adding appends to the end so nothing already placed moves', () => {
    const { onToolsChange } = renderEditor({ tools: ['calendar', 'academy'] });
    fireEvent.click(screen.getByRole('button', { name: /add finance/i }));
    expect(onToolsChange).toHaveBeenCalledWith(['calendar', 'academy', 'finance']);
  });

  it('disables adding at the cap and says why', () => {
    const eight = available.concat(available).slice(0, 8).map((e) => e.key);
    renderEditor({ tools: eight, available });
    expect(screen.getByTestId('my-space-count')).toHaveTextContent('8 of 8');
    expect(screen.getByTestId('my-space-full')).toBeInTheDocument();
  });

  it('groups available tools under their section label', () => {
    renderEditor({ tools: [] });
    const more = screen.getByTestId('my-space-more');
    expect(within(more).getByText('Money')).toBeInTheDocument();
  });
});

describe('MySpaceEditor — widgets', () => {
  it('is absent when no widget options are given', () => {
    renderEditor();
    expect(screen.queryByTestId('my-space-widgets')).toBeNull();
  });

  it('toggles a widget on and caps the selection at two', () => {
    const onWidgetsChange = vi.fn();
    const opts = widgetsFor('faculty');
    render(
      <MySpaceEditor
        available={available}
        tools={[]}
        onToolsChange={vi.fn()}
        widgetOptions={opts}
        widgets={[opts[0].key]}
        onWidgetsChange={onWidgetsChange}
      />,
    );
    expect(screen.getByTestId('my-space-widget-count')).toHaveTextContent('1 of 2');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(opts[1].label, 'i') }));
    expect(onWidgetsChange).toHaveBeenCalledWith([opts[0].key, opts[1].key]);
  });

  it('deselects a chosen widget', () => {
    const onWidgetsChange = vi.fn();
    const opts = widgetsFor('faculty');
    render(
      <MySpaceEditor
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
});

describe('MySpaceEditor — disabled', () => {
  it('emits nothing when disabled', () => {
    const { onToolsChange } = renderEditor({ disabled: true, tools: ['calendar'] });
    const btn = screen.queryByRole('button', { name: /remove calendar/i });
    if (btn) fireEvent.click(btn);
    expect(onToolsChange).not.toHaveBeenCalled();
  });
});

describe('MySpaceEditor — accessibility', () => {
  it('gives every action button an accessible name', () => {
    renderEditor();
    for (const b of screen.getAllByRole('button')) {
      expect(b).toHaveAccessibleName();
    }
  });
});
