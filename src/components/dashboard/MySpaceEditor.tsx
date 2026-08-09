// MySpaceEditor — Control-Center-shaped editor for a member's My Tools shelf
// and (optionally) their home widgets. Modeled on iOS Settings → Control
// Center: an "In Your Space" inset card of what's included (⊖ badges + drag
// handles + an n-of-cap counter), then "More Tools" grouped by section
// (⊕ badges), then an optional "Widgets" group (✓ toggles).
//
// Presentation only: no query, no save, no notion of whose record this is.
// The personal /dashboard/my-space page, its admin "Defaults for members"
// mode, and the first-run sheet all mount this same component and own
// persistence (and the tenant/member identity) themselves.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md
import { useMemo } from 'react';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Minus, Plus, Check } from 'lucide-react';
import { NAV_SECTION_LABELS, type CatalogEntry, type NavSectionKey } from '@/lib/navigation/navCatalog';
import { MY_TOOLS_CAP, WIDGETS_CAP } from '@/lib/navigation/myTools';
import type { HomeWidget } from '@/lib/navigation/homeWidgets';

export interface MySpaceEditorProps {
  /** Every entry the viewer may use, already gated. Order is catalog order. */
  available: CatalogEntry[];
  /** Currently chosen tool keys, in the member's order. */
  tools: string[];
  onToolsChange: (next: string[]) => void;
  /** Omit the whole widgets group (tenant-defaults mode has no widgets). */
  widgetOptions?: HomeWidget[];
  widgets?: string[];
  onWidgetsChange?: (next: string[]) => void;
  /** Read-only render for a viewer without permission to edit. */
  disabled?: boolean;
}

const SECTION_ORDER = Object.keys(NAV_SECTION_LABELS) as NavSectionKey[];

const CARD = 'bg-card rounded-xl divide-y divide-border overflow-hidden';
const GROUP_HEADER = 'text-[13px] uppercase tracking-wide text-muted-foreground px-4 pb-1';
const ROW_LABEL = 'flex-1 text-[17px] truncate';
const CAPTION = 'text-[13px] text-muted-foreground';

function ChosenRow({ entry, disabled, onRemove }: {
  entry: CatalogEntry;
  disabled?: boolean;
  onRemove: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.key, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className="flex items-center gap-3 min-h-11 px-4 bg-card"
    >
      <button
        type="button"
        onClick={() => onRemove(entry.key)}
        disabled={disabled}
        aria-label={`Remove ${entry.label}`}
        className="shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center disabled:opacity-40"
      >
        <Minus className="w-4 h-4" aria-hidden />
      </button>
      <entry.icon className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden />
      <span className={ROW_LABEL}>{entry.label}</span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Reorder ${entry.label}`}
        className="shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground touch-none disabled:opacity-40"
      >
        <GripVertical className="w-4 h-4" aria-hidden />
      </button>
    </li>
  );
}

export function MySpaceEditor({
  available,
  tools,
  onToolsChange,
  widgetOptions,
  widgets,
  onWidgetsChange,
  disabled,
}: MySpaceEditorProps) {
  const byKey = useMemo(() => new Map(available.map((e) => [e.key, e])), [available]);
  const chosen = useMemo(
    () => tools.map((k) => byKey.get(k)).filter((e): e is CatalogEntry => e !== undefined),
    [tools, byKey],
  );
  const chosenKeys = useMemo(() => new Set(tools), [tools]);
  const atCap = tools.length >= MY_TOOLS_CAP;

  const moreBySection = useMemo(() => {
    const bySection = new Map<NavSectionKey, CatalogEntry[]>();
    for (const entry of available) {
      if (chosenKeys.has(entry.key)) continue;
      const list = bySection.get(entry.section) ?? [];
      list.push(entry);
      bySection.set(entry.section, list);
    }
    return SECTION_ORDER
      .map((section) => ({ section, label: NAV_SECTION_LABELS[section], entries: bySection.get(section) ?? [] }))
      .filter((g) => g.entries.length > 0);
  }, [available, chosenKeys]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tools.indexOf(String(active.id));
    const newIndex = tools.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onToolsChange(arrayMove(tools, oldIndex, newIndex));
  };

  const removeTool = (key: string) => {
    if (disabled) return;
    onToolsChange(tools.filter((k) => k !== key));
  };

  const addTool = (key: string) => {
    if (disabled || atCap || tools.includes(key)) return;
    onToolsChange([...tools, key]);
  };

  const widgetList = widgets ?? [];
  const toggleWidget = (key: string) => {
    if (disabled || !onWidgetsChange) return;
    if (widgetList.includes(key)) {
      onWidgetsChange(widgetList.filter((k) => k !== key));
    } else if (widgetList.length >= WIDGETS_CAP) {
      // Cap never blocks a tap silently — the oldest pick is bumped.
      onWidgetsChange([...widgetList.slice(1), key]);
    } else {
      onWidgetsChange([...widgetList, key]);
    }
  };

  return (
    <div className="space-y-6 bg-background">
      <section>
        <h2 className={GROUP_HEADER}>In Your Space</h2>
        <div data-testid="my-space-chosen" className={CARD}>
          {chosen.length === 0 ? (
            <p className={`min-h-11 flex items-center px-4 ${CAPTION}`}>
              Nothing chosen yet — add tools below.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tools} strategy={verticalListSortingStrategy}>
                <ul>
                  {chosen.map((entry, i) => (
                    <ChosenRow key={`${entry.key}-${i}`} entry={entry} disabled={disabled} onRemove={removeTool} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div className="flex items-center justify-between px-4 pt-1.5">
          <span data-testid="my-space-count" className={CAPTION}>
            {tools.length} of {MY_TOOLS_CAP}
          </span>
        </div>
        {atCap && (
          <p data-testid="my-space-full" className={`${CAPTION} px-4 pt-1`}>
            Your space is full — remove one to add another.
          </p>
        )}
      </section>

      <section>
        <h2 className={GROUP_HEADER}>More Tools</h2>
        <div data-testid="my-space-more" className="space-y-4">
          {moreBySection.map(({ section, label, entries }) => (
            <div key={section}>
              <div className={GROUP_HEADER}>{label}</div>
              <div className={CARD}>
                {entries.map((entry) => (
                  <div key={entry.key} className="flex items-center gap-3 min-h-11 px-4">
                    <entry.icon className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className={ROW_LABEL}>{entry.label}</span>
                    <button
                      type="button"
                      onClick={() => addTool(entry.key)}
                      disabled={disabled || atCap}
                      aria-label={`Add ${entry.label}`}
                      className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {widgetOptions && (
        <section>
          <h2 className={GROUP_HEADER}>Widgets</h2>
          <div data-testid="my-space-widgets" className={CARD}>
            {widgetOptions.map((opt) => {
              const selected = widgetList.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleWidget(opt.key)}
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={opt.label}
                  className="w-full flex items-center gap-3 min-h-11 px-4 text-left disabled:opacity-40"
                >
                  <span className="flex-1">
                    <span className="block text-[17px]">{opt.label}</span>
                    <span className={`block ${CAPTION}`}>{opt.description}</span>
                  </span>
                  <span
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      selected ? 'bg-primary/10 text-primary' : 'bg-muted text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4" aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="px-4 pt-1.5">
            <span data-testid="my-space-widget-count" className={CAPTION}>
              {widgetList.length} of {WIDGETS_CAP}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
