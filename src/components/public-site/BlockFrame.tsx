// Editor canvas wrapper. Adds Wix-style hover/select outline and a floating
// per-block toolbar so tenants can arrange the page directly on the preview
// instead of hunting for controls in a side accordion. Only used when the
// block is rendered inside PublicPageEditor's preview — the public site keeps
// getting the bare block.
//
// The frame ALSO participates in dnd-kit sortable, so grabbing the toolbar's
// drag handle reorders blocks on the canvas (in addition to the sidebar's
// Layers panel). Must be rendered inside a SortableContext ancestor.
import { forwardRef, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  Settings2,
  Trash2,
} from 'lucide-react';

export interface BlockFrameProps {
  /** dnd-kit sortable id — must be unique across the SortableContext. */
  id: string;
  children: ReactNode;
  blockName: string;
  selected: boolean;
  hovered: boolean;
  visible: boolean;
  locked: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
}

// Toolbar button — thin wrapper for consistent hit target + hover.
function TB({
  onClick,
  title,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

export const BlockFrame = forwardRef<HTMLDivElement, BlockFrameProps>(function BlockFrame(
  {
    id,
    children,
    blockName,
    selected,
    hovered,
    visible,
    locked,
    canMoveUp,
    canMoveDown,
    onSelect,
    onHoverChange,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onToggleVisibility,
    onDelete,
    onOpenSettings,
  },
  ref,
) {
  const showChrome = selected || hovered;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: locked });

  // Merge the sortable node ref with the outer forwardRef so callers (the
  // editor's scroll-into-view logic) still get the DOM node while dnd-kit
  // also has it.
  const mergeRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <div
      ref={mergeRefs}
      data-block-frame
      className={`relative ${isDragging ? 'z-30 opacity-90 shadow-2xl' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={(e) => {
        // Select on click, but let inner interactive elements (buttons/inputs
        // used by inline editing) receive their event first via bubbling —
        // they can call stopPropagation to opt out of selection.
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Outline overlay lives above the block content but below the toolbar.
          `outline` (not `border`) so it never nudges layout — critical when
          the block has `position: sticky` (header) or measured heights. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-10 transition-[outline-color,outline-style] ${
          selected
            ? 'outline outline-2 -outline-offset-2 outline-primary'
            : hovered
              ? 'outline outline-2 -outline-offset-2 outline-dashed outline-primary/50'
              : ''
        }`}
      />

      {/* Floating toolbar pinned to the top-right of the block. Sits above
          the outline so its buttons stay clickable. */}
      {showChrome && (
        <div
          className="absolute top-2 right-2 z-20 inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/95 backdrop-blur px-1 py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle — spreads the dnd-kit sortable listeners so grabbing
              the pill drags the block to a new position. Hidden for the
              locked header (it can't move) so the toolbar stays balanced. */}
          {!locked && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              title="Drag to reorder"
              className="p-1.5 rounded cursor-grab active:cursor-grabbing text-slate-500 hover:bg-slate-100 hover:text-slate-700 touch-none"
              aria-label="Reorder block"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="pl-1 pr-1 text-xs font-medium text-slate-700 whitespace-nowrap">
            {blockName}
          </span>
          <span className="w-px h-4 bg-slate-200 mx-0.5" />
          {locked ? (
            <span
              className="p-1.5 text-slate-400"
              title="Locked — the header stays at the top of every page"
            >
              <Lock className="w-3.5 h-3.5" />
            </span>
          ) : (
            <>
              <TB onClick={onMoveUp} title="Move up" disabled={!canMoveUp}>
                <ArrowUp className="w-3.5 h-3.5" />
              </TB>
              <TB onClick={onMoveDown} title="Move down" disabled={!canMoveDown}>
                <ArrowDown className="w-3.5 h-3.5" />
              </TB>
              <TB onClick={onDuplicate} title="Duplicate">
                <Copy className="w-3.5 h-3.5" />
              </TB>
              <TB
                onClick={onToggleVisibility}
                title={visible ? 'Hide from published site' : 'Show on published site'}
              >
                {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </TB>
            </>
          )}
          <TB onClick={onOpenSettings} title="Block settings">
            <Settings2 className="w-3.5 h-3.5" />
          </TB>
          {!locked && (
            <TB onClick={onDelete} title="Delete block" danger>
              <Trash2 className="w-3.5 h-3.5" />
            </TB>
          )}
        </div>
      )}

      {/* Hidden blocks stay in the preview but dim so tenants can still see
          what they've toggled off. The public site skips them entirely. */}
      <div className={visible ? '' : 'opacity-40 pointer-events-none'}>{children}</div>
    </div>
  );
});
