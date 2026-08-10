// One group header inside MyWorldEditor's "In Your World" card: a collapse
// caret, the member's name for the group, a count, and an options menu.
//
// Extracted rather than inlined because MyWorldEditor is already 300 lines
// and the group UI would push it past 550 — past the point where the whole
// file fits in one reading.
// Spec: docs/superpowers/specs/2026-08-10-my-world-groups-design.md §5.4
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GROUP_NAME_MAX, type ToolGroup } from '@/lib/navigation/myTools';

export interface MyWorldGroupRowProps {
  group: ToolGroup;
  /** Rendered tool count — may differ from group.tools.length when a tool is gated off. */
  count: number;
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: string, name: string) => void;
  onToggle: (id: string, collapsed: boolean) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onDelete: (id: string) => void;
  /**
   * Mount already in the inline name field, focused. Spec §5.4: creating a
   * group focuses its name field, so the member names it in place instead of
   * living with "New Group" until they find the ⋯ → Rename item.
   *
   * Read once, at mount — a newly created group is a newly mounted row (its
   * id is fresh, so React never reuses another group's row for it), and
   * re-deriving `editing` from a prop would yank a member back into the field
   * on an unrelated re-render.
   */
  autoFocusName?: boolean;
}

// 14px padding, not MyWorldEditor's 10px (p-2.5): this wraps a bare 16px
// icon (w-4 h-4), not a 24px badge, so it needs more padding to reach the
// same 44px tap target — 16 + 14 + 14 = 44. Do not "harmonize" this with
// MyWorldEditor's TAP_TARGET; that would silently shrink this to 36px.
const TAP_TARGET = 'shrink-0 p-3.5 -m-3.5 flex items-center justify-center disabled:opacity-40';

export function MyWorldGroupRow({
  group, count, disabled, isFirst, isLast, onRename, onToggle, onMove, onDelete, autoFocusName,
}: MyWorldGroupRowProps) {
  const [editing, setEditing] = useState(autoFocusName === true);
  const [draft, setDraft] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);
  // True only for a field opened by group CREATION, never by ⋯ → Rename.
  const openedByCreate = useRef(autoFocusName === true);

  useEffect(() => {
    if (!editing) return;
    // focus() only on the create path. On the ⋯ → Rename path the Radix menu
    // is still mounted when this runs, and its FocusScope traps focus: our
    // focus() is pulled straight back out, which fires this field's own
    // onBlur → commit() → setEditing(false), closing the field the instant it
    // opened. (Proven with a probe; see the fix report.) select() alone is
    // what that path has always done, so it is left exactly as it was.
    if (openedByCreate.current) {
      openedByCreate.current = false;
      inputRef.current?.focus();
    }
    inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const name = draft.trim();
    // An empty name is abandoned, not saved: a headerless group is
    // unreachable in the editor and invisible on the shelf.
    if (name) onRename(group.id, name);
    setEditing(false);
  };

  const abandon = () => {
    setDraft(group.name);
    setEditing(false);
  };

  return (
    <li className="flex items-center gap-2 min-h-11 px-4 bg-muted/40" data-testid={`my-world-group-${group.id}`}>
      <button
        type="button"
        onClick={() => onToggle(group.id, !group.collapsed)}
        aria-label={`${group.collapsed ? 'Expand' : 'Collapse'} ${group.name}`}
        aria-expanded={!group.collapsed}
        className={TAP_TARGET}
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform motion-reduce:transition-none ${group.collapsed ? '' : 'rotate-90'}`}
          aria-hidden
        />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          aria-label="Group name"
          value={draft}
          maxLength={GROUP_NAME_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') abandon();
          }}
          className="flex-1 min-w-0 bg-transparent text-[15px] font-semibold outline-none border-b border-primary"
        />
      ) : (
        <span className="flex-1 min-w-0 truncate text-[15px] font-semibold">{group.name}</span>
      )}

      <span data-testid={`my-world-group-count-${group.id}`} className="text-[13px] text-muted-foreground tabular-nums">
        {count}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={disabled} aria-label={`Options for ${group.name}`} className={TAP_TARGET}>
            <MoreHorizontal className="w-4 h-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => { setDraft(group.name); setEditing(true); }}>
            Rename
          </DropdownMenuItem>
          {!isFirst && <DropdownMenuItem onSelect={() => onMove(group.id, -1)}>Move up</DropdownMenuItem>}
          {!isLast && <DropdownMenuItem onSelect={() => onMove(group.id, 1)}>Move down</DropdownMenuItem>}
          {/* The label says what happens to the tools. Deleting a group is a
              reorganization; a member must not fear losing pins to it. */}
          <DropdownMenuItem onSelect={() => onDelete(group.id)}>
            Delete group (keeps tools)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
