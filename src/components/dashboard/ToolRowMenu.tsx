// The per-tool "Move to…" menu in MyWorldEditor.
//
// This exists so that NO group change depends on a drag. GleeWorld is used
// heavily on iPad and iOS, where drag-between-containers is the least
// reliable gesture available — if dragging were the only way to file a tool,
// a member who cannot complete the drag simply could not group. It is also
// the only path that works with a keyboard or VoiceOver. Drag still works
// for anyone who prefers it; it is just not load-bearing.
// Spec: docs/superpowers/specs/2026-08-10-my-world-groups-design.md §5.4
import { FolderInput } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ToolGroup } from '@/lib/navigation/myTools';

export interface ToolRowMenuProps {
  toolLabel: string;
  /** null when the tool is loose. */
  currentGroupId: string | null;
  groups: ToolGroup[];
  disabled?: boolean;
  onMoveTo: (targetGroupId: string | null) => void;
  onNewGroup: () => void;
}

// p-3.5, NOT the p-2.5 used in MyWorldEditor. That constant pads a 24px
// BADGE (w-6 h-6) to 24+10+10 = 44px. This row's control is a bare 16px
// icon (w-4 h-4), so the same padding would yield only 36px and miss the
// 44px minimum target. 16+14+14 = 44. The negative margin still pulls the
// padding back, so the hit area grows without moving a pixel of layout.
const TAP_TARGET = 'shrink-0 p-3.5 -m-3.5 flex items-center justify-center disabled:opacity-40';

export function ToolRowMenu({
  toolLabel, currentGroupId, groups, disabled, onMoveTo, onNewGroup,
}: ToolRowMenuProps) {
  const targets = groups.filter((g) => g.id !== currentGroupId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={disabled} aria-label={`Move ${toolLabel}`} className={TAP_TARGET}>
          <FolderInput className="w-4 h-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {targets.map((g) => (
          <DropdownMenuItem key={g.id} onSelect={() => onMoveTo(g.id)}>
            {g.name}
          </DropdownMenuItem>
        ))}
        {currentGroupId !== null && (
          <DropdownMenuItem onSelect={() => onMoveTo(null)}>Move out of group</DropdownMenuItem>
        )}
        {(targets.length > 0 || currentGroupId !== null) && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={onNewGroup}>New group…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
