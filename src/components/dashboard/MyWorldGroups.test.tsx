// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MyWorldGroupRow } from './MyWorldGroupRow';
import { ToolRowMenu } from './ToolRowMenu';
import { MyWorldEditor } from './MyWorldEditor';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';
import type { ToolGroup } from '@/lib/navigation/myTools';

// Radix's DropdownMenuTrigger (@radix-ui/react-dropdown-menu 2.1.2, installed
// here) opens on native `pointerdown`, not `click` or `mousedown` — verified
// by reading node_modules/@radix-ui/react-dropdown-menu/dist/index.mjs. jsdom
// 20 (this repo's version) has no global PointerEvent, so Testing Library's
// event-map falls back to a bare `Event` for fireEvent.pointerDown, which
// drops `button`/`ctrlKey` and makes Radix's open guard fail. This minimal
// polyfill is scoped to this suite only, per vitest.setup.ts's own note to
// scope jsdom-gap stubs to the specific suite that needs them.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).PointerEvent = PointerEventPolyfill;
  }
});

const group: ToolGroup = { id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false };

const renderRow = (over: Partial<React.ComponentProps<typeof MyWorldGroupRow>> = {}) => {
  const props = {
    group, count: 1, isFirst: true, isLast: false,
    onRename: vi.fn(), onToggle: vi.fn(), onMove: vi.fn(), onDelete: vi.fn(),
    ...over,
  };
  render(<MyWorldGroupRow {...props} />);
  return props;
};

// Radix DropdownMenu triggers activate on pointerdown, NOT click. fireEvent.click
// on the trigger passes vacuously and asserts nothing — that mistake has
// already silently killed 3+ tests on this feature.
const openMenu = (name: RegExp) =>
  fireEvent.pointerDown(screen.getByRole('button', { name }), { button: 0, ctrlKey: false });

describe('MyWorldGroupRow', () => {
  it('shows the group name and its count', () => {
    renderRow();
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByTestId('my-world-group-count-a')).toHaveTextContent('1');
  });

  it('toggles collapse', () => {
    const props = renderRow();
    fireEvent.click(screen.getByRole('button', { name: /Collapse Sunday/ }));
    expect(props.onToggle).toHaveBeenCalledWith('a', true);
  });

  it('renames through an inline field committed on Enter', async () => {
    const props = renderRow();
    openMenu(/Options for Sunday/);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByLabelText('Group name');
    fireEvent.change(input, { target: { value: 'Liturgy' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onRename).toHaveBeenCalledWith('a', 'Liturgy');
  });

  it('abandons a rename on Escape', async () => {
    const props = renderRow();
    openMenu(/Options for Sunday/);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    fireEvent.keyDown(screen.getByLabelText('Group name'), { key: 'Escape' });
    expect(props.onRename).not.toHaveBeenCalled();
  });

  it('does not offer Move up on the first group', async () => {
    renderRow({ isFirst: true });
    openMenu(/Options for Sunday/);
    expect(await screen.findByRole('menuitem', { name: 'Move down' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Move up' })).not.toBeInTheDocument();
  });

  it('warns that delete keeps the tools', async () => {
    const props = renderRow();
    openMenu(/Options for Sunday/);
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete group/ }));
    expect(props.onDelete).toHaveBeenCalledWith('a');
  });
});

const groups: ToolGroup[] = [
  { id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false },
  { id: 'b', name: 'Teaching', tools: [], collapsed: false },
];

describe('ToolRowMenu', () => {
  it('offers every group except the one the tool is already in', async () => {
    render(<ToolRowMenu toolLabel="Liturgy Planner" currentGroupId="a" groups={groups}
      onMoveTo={vi.fn()} onNewGroup={vi.fn()} />);
    openMenu(/Move Liturgy Planner/);
    expect(await screen.findByRole('menuitem', { name: 'Teaching' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Sunday' })).not.toBeInTheDocument();
  });

  it('offers "Move out of group" only for a grouped tool', async () => {
    render(<ToolRowMenu toolLabel="Liturgy Planner" currentGroupId="a" groups={groups}
      onMoveTo={vi.fn()} onNewGroup={vi.fn()} />);
    openMenu(/Move Liturgy Planner/);
    expect(await screen.findByRole('menuitem', { name: 'Move out of group' })).toBeInTheDocument();
  });

  it('omits "Move out of group" for a loose tool', async () => {
    render(<ToolRowMenu toolLabel="Calendar" currentGroupId={null} groups={groups}
      onMoveTo={vi.fn()} onNewGroup={vi.fn()} />);
    openMenu(/Move Calendar/);
    expect(await screen.findByRole('menuitem', { name: 'Sunday' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Move out of group' })).not.toBeInTheDocument();
  });

  it('reports the chosen target', async () => {
    const onMoveTo = vi.fn();
    render(<ToolRowMenu toolLabel="Calendar" currentGroupId={null} groups={groups}
      onMoveTo={onMoveTo} onNewGroup={vi.fn()} />);
    openMenu(/Move Calendar/);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sunday' }));
    expect(onMoveTo).toHaveBeenCalledWith('a');
  });

  it('reports "move out" as a null target', async () => {
    const onMoveTo = vi.fn();
    render(<ToolRowMenu toolLabel="Liturgy Planner" currentGroupId="a" groups={groups}
      onMoveTo={onMoveTo} onNewGroup={vi.fn()} />);
    openMenu(/Move Liturgy Planner/);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move out of group' }));
    expect(onMoveTo).toHaveBeenCalledWith(null);
  });
});

const available = NAV_CATALOG.filter((e) =>
  ['calendar', 'messages', 'liturgy', 'academy', 'studio'].includes(e.key));

const renderEditor = (over: Partial<React.ComponentProps<typeof MyWorldEditor>> = {}) => {
  const onToolsChange = vi.fn<(next: string[]) => void>();
  const onGroupsChange = vi.fn<(next: ToolGroup[]) => void>();
  render(
    <MyWorldEditor
      available={available}
      tools={['calendar', 'messages']}
      groups={[{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }]}
      onToolsChange={onToolsChange}
      onGroupsChange={onGroupsChange}
      {...over}
    />,
  );
  return { onToolsChange, onGroupsChange };
};

describe('MyWorldEditor — groups', () => {
  it('renders loose rows, then the group header, then its members', () => {
    renderEditor();
    const text = screen.getByTestId('my-world-chosen').textContent ?? '';
    expect(text.indexOf('Calendar')).toBeLessThan(text.indexOf('Sunday'));
    expect(text.indexOf('Sunday')).toBeLessThan(text.indexOf('Liturgy Planner'));
  });

  it('shows an EMPTY group in the editor — unlike the shelf', () => {
    renderEditor({ groups: [{ id: 'z', name: 'Later', tools: [], collapsed: false }] });
    expect(screen.getByTestId('my-world-group-z')).toBeInTheDocument();
  });

  // A collapsed group must still be reachable: its header (and therefore its
  // options menu, the only way to expand or delete it) stays rendered.
  it('hides a collapsed group\'s members but keeps its header', () => {
    renderEditor({ groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: true }] });
    expect(screen.getByTestId('my-world-group-a')).toBeInTheDocument();
    expect(within(screen.getByTestId('my-world-chosen')).queryByText('Liturgy Planner')).toBeNull();
  });

  it('creates a group from the New Group row', () => {
    const { onGroupsChange } = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'New Group' }));
    expect(onGroupsChange).toHaveBeenCalled();
    const next = onGroupsChange.mock.calls.at(-1)![0];
    expect(next).toHaveLength(2);
    expect(next.at(-1)!.tools).toEqual([]);
    expect(next.at(-1)!.id).toEqual(expect.any(String));
    expect(next.at(-1)!.id).not.toEqual('a');
  });

  it('counts every chosen tool, loose and grouped', () => {
    renderEditor();
    expect(screen.getByTestId('my-world-count')).toHaveTextContent('3 tools');
  });

  // A grouped tool is still chosen — offering it again in More Tools would
  // let a member add a second copy of something already on their shelf.
  it('never offers a grouped tool in More Tools', () => {
    renderEditor();
    expect(screen.queryByRole('button', { name: 'Add Liturgy Planner' })).toBeNull();
  });

  it('moving a tool into a group updates BOTH lists in one interaction', async () => {
    const { onToolsChange, onGroupsChange } = renderEditor();
    openMenu(/Move Calendar/);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sunday' }));
    expect(onToolsChange).toHaveBeenCalledWith(['messages']);
    expect(onGroupsChange.mock.calls.at(-1)![0][0].tools).toEqual(['liturgy', 'calendar']);
  });

  it('deleting a group rehomes its tools to loose', async () => {
    const { onToolsChange, onGroupsChange } = renderEditor();
    openMenu(/Options for Sunday/);
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete group/ }));
    expect(onToolsChange).toHaveBeenCalledWith(['calendar', 'messages', 'liturgy']);
    expect(onGroupsChange.mock.calls.at(-1)![0]).toEqual([]);
  });

  it('a tool added from More Tools lands loose', () => {
    const { onToolsChange, onGroupsChange } = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Add Studio' }));
    expect(onToolsChange).toHaveBeenCalledWith(['calendar', 'messages', 'studio']);
    expect(onGroupsChange).not.toHaveBeenCalled();
  });

  // The tenant-defaults tab stores a flat text[] that cannot hold groups
  // until Phase 2, so it omits onGroupsChange. Every group affordance must
  // disappear with it — a New Group button wired to a no-op is a dead
  // control, and a Move to… menu there would silently discard the edit.
  it('renders no group UI at all when onGroupsChange is omitted', () => {
    render(<MyWorldEditor available={available} tools={['calendar', 'messages']} onToolsChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'New Group' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();
    expect(screen.queryByTestId('my-world-group-a')).toBeNull();
  });

  it('drops group headers and menus but still lists tools when groups are passed without a handler', () => {
    render(
      <MyWorldEditor
        available={available}
        tools={['calendar']}
        groups={[{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }]}
        onToolsChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('my-world-group-a')).toBeNull();
    expect(screen.queryByRole('button', { name: 'New Group' })).toBeNull();
    expect(screen.getByTestId('my-world-count')).toHaveTextContent('1 tool');
  });
});
