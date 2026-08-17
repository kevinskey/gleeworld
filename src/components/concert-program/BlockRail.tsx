// Block rail — screen-only chrome for reordering, deleting, and inserting
// whole blocks. Lives OUTSIDE the paginated `.cp-page` canvas entirely (a
// left gutter on lg+, a collapsible section in the mobile Sheet drawer
// otherwise) rather than as sortable handles attached to the scaled sheet
// itself — dnd-kit's pointer math and CSS `transform: scale` on the sheet
// don't mix reliably, so this sidesteps that instead of fighting it.
//
// Title stays first, footer stays last: both render as plain (non-sortable,
// no buttons) rows here, never inside the SortableContext and never wired
// to move/delete. The desktop pointer-only sensor (no TouchSensor) matches
// the plan: below-lg reorder is the up/down buttons here, not drag.
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from 'lucide-react';
import type { ProgramBlock } from '@/lib/concertProgram/types';

export interface BlockRailProps {
  blocks: ProgramBlock[];
  onReorderMiddle(nextMiddle: ProgramBlock[]): void;
  onMoveBlock(blockId: string, direction: 'up' | 'down'): void;
  onDeleteBlock(blockId: string): void;
  onInsertTextAt(indexInMiddle: number): void;
}

// Pure transformation behind handleDragEnd below — extracted so it's
// testable without simulating a real dnd-kit pointer gesture in jsdom
// (impractical: PointerSensor drives off real pointer events dnd-kit
// itself listens for). Returns `null` for every no-op case (dropped on
// itself, either id not present in the middle slice) so callers can tell
// "nothing changed" apart from "reordered to the same visual spot".
export function reorderMiddleIds(middleIds: string[], activeId: string, overId: string): string[] | null {
  if (activeId === overId) return null;
  const oldIndex = middleIds.indexOf(activeId);
  const newIndex = middleIds.indexOf(overId);
  if (oldIndex === -1 || newIndex === -1) return null;
  return arrayMove(middleIds, oldIndex, newIndex);
}

function blockLabel(b: ProgramBlock): string {
  switch (b.kind) {
    case 'title': return 'Title';
    case 'footer': return 'Footer';
    case 'divider': return '—o— Divider';
    case 'text': return 'Text';
    case 'roster': return 'Roster';
    case 'piece-group': return b.sectionHeading || 'Pieces';
    default: return 'Block';
  }
}

function InsertHereRow({ onInsert, label }: { onInsert: () => void; label: string }) {
  return (
    <div className="group/insert relative h-2">
      <button
        type="button"
        onClick={onInsert}
        aria-label={`Insert text block ${label}`}
        className="absolute inset-x-0 -top-1 h-3 flex items-center justify-center rounded opacity-0 transition-opacity hover:bg-primary/10 focus-visible:opacity-100 group-hover/insert:opacity-100"
      >
        <Plus className="w-3 h-3 text-primary" />
      </button>
    </div>
  );
}

function BlockHandleRow({
  block, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDelete,
}: {
  block: ProgramBlock;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const label = blockLabel(block);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-1.5 text-xs"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${label}`}
        className="touch-none cursor-grab text-muted-foreground hover:text-foreground shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="flex-1 truncate">{label}</span>
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        aria-label={`Move ${label} up`}
        className="text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none shrink-0"
      >
        <ChevronUp className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        aria-label={`Move ${label} down`}
        className="text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none shrink-0"
      >
        <ChevronDown className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        className="text-muted-foreground hover:text-rose-500 shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function BlockRail({
  blocks, onReorderMiddle, onMoveBlock, onDeleteBlock, onInsertTextAt,
}: BlockRailProps) {
  // Deliberately omit TouchSensor — below-lg reorder is the up/down buttons,
  // never drag (same rule the piece popover reorder already follows).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const titleBlock = blocks.find((b) => b.kind === 'title');
  const footerBlock = blocks.find((b) => b.kind === 'footer');
  const middle = blocks.filter((b) => b.kind !== 'title' && b.kind !== 'footer');
  const middleIds = middle.map((b) => b.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const reorderedIds = reorderMiddleIds(middleIds, String(active.id), String(over.id));
    if (!reorderedIds) return;
    const byId = new Map(middle.map((b) => [b.id, b]));
    onReorderMiddle(reorderedIds.map((id) => byId.get(id)!));
  };

  return (
    <div className="space-y-0.5">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Blocks</h3>
      {titleBlock ? (
        <div className="rounded-md border border-dashed border-border px-1.5 py-1.5 text-xs text-muted-foreground mb-0.5">
          Title
        </div>
      ) : null}
      <InsertHereRow label="at the top" onInsert={() => onInsertTextAt(0)} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={middleIds} strategy={verticalListSortingStrategy}>
          {middle.map((b, i) => (
            <div key={b.id}>
              <BlockHandleRow
                block={b}
                canMoveUp={i > 0}
                canMoveDown={i < middle.length - 1}
                onMoveUp={() => onMoveBlock(b.id, 'up')}
                onMoveDown={() => onMoveBlock(b.id, 'down')}
                onDelete={() => onDeleteBlock(b.id)}
              />
              <InsertHereRow label={`after ${blockLabel(b)}`} onInsert={() => onInsertTextAt(i + 1)} />
            </div>
          ))}
        </SortableContext>
      </DndContext>
      {footerBlock ? (
        <div className="rounded-md border border-dashed border-border px-1.5 py-1.5 text-xs text-muted-foreground mt-0.5">
          Footer
        </div>
      ) : null}
    </div>
  );
}
