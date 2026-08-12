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
  /**
   * Read-only render for a viewer without permission to edit. Gates the ⋯
   * menu (rename / reorder / delete are edits) but DELIBERATELY not the
   * collapse caret: collapsing is a reading action, not an arranging one, so
   * someone who may only look at a shelf can still fold a group they are not
   * interested in. Same distinction the live sidebar draws, where collapse is
   * the one thing a member can do to the nav in place.
   */
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
  // The menu is CONTROLLED so the rename field can be opened from the close
  // transition rather than from onSelect — see the two focus stealers below.
  const [menuOpen, setMenuOpen] = useState(false);
  const wantRename = useRef(false);

  // One mechanism for both ways in (creation and ⋯ → Rename): the field is
  // focused whenever it opens.
  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
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

      {/* Opening the rename field takes defeating TWO independent focus
          stealers in @radix-ui/react-menu.

          (a) THE TRAP, while the content is still mounted. FocusScope
              registers a document `focusin` handler when trapped (a modal
              dropdown is), and snaps any focus landing outside the menu back
              to the last focused element — the menu item. MenuContent sits
              inside Presence, which defers unmount by a render, while
              FocusScope tears down in a passive cleanup: there is a commit
              where our field is mounted and the trap is still armed. So the
              field must not open from onSelect at all. It opens from the
              CLOSE transition instead, deferred one frame past the unmount —
              hence the controlled `open` and the rAF.
          (b) THE RESTORE, after the content unmounts. FocusScope's cleanup
              refocuses the trigger from a setTimeout(0), and this menu's
              onCloseAutoFocus does the same. preventDefault() skips both
              (composeEventHandlers checks for it). A bare setTimeout(0) of
              our own would NOT be enough — it queues before Radix's, so the
              trigger refocus would still land on top of the open field.

          WHAT THE TESTS ACTUALLY PIN. Only (a) is covered. Ablation on
          2026-08-10: rewiring Rename to open the field straight from
          `onSelect` — defeating neither stealer — fails 3 of this file's 33
          tests. But dropping the rAF alone leaves 33/33 GREEN, and dropping
          `onCloseAutoFocus` alone leaves 33/33 GREEN. jsdom's rAF is a
          setInterval(1000/60) ≈ 16.7ms, so it lands after Radix's
          setTimeout(0) whether or not we ask it to, and RTL's act() flushes
          Presence's deferred unmount synchronously. See the note at each
          guard site below before deleting either one: a green suite is not
          evidence that they are dead code. */}
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (open || !wantRename.current) return;
          wantRename.current = false;
          setDraft(group.name);
          // LOAD-BEARING IN A REAL BROWSER, NOT PINNED BY THIS SUITE.
          // The rAF pushes setEditing past Presence's deferred unmount, so
          // the field mounts after FocusScope's trap is torn down. Ablated
          // 2026-08-10: replacing this with a bare setEditing(true) still
          // passes all 33 tests, because jsdom's rAF is setInterval(1000/60)
          // and RTL's act() flushes the deferred unmount synchronously —
          // neither reproduces the real commit ordering. Green tests are NOT
          // evidence this is superfluous. Verify in a browser before removing.
          requestAnimationFrame(() => setEditing(true));
        }}
      >
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={disabled} aria-label={`Options for ${group.name}`} className={TAP_TARGET}>
            <MoreHorizontal className="w-4 h-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        {/* onCloseAutoFocus preventDefault is LOAD-BEARING IN A REAL BROWSER
            and NOT PINNED BY THIS SUITE — it is stealer (b) above. Ablated
            2026-08-10: removing it still passes all 33 tests, because jsdom
            never runs the trigger-refocus race that eats the field's focus.
            Green tests are NOT evidence this is dead code. Verify in a
            browser before removing. */}
        <DropdownMenuContent align="end" onCloseAutoFocus={(event) => event.preventDefault()}>
          <DropdownMenuItem onSelect={() => { wantRename.current = true; }}>
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
