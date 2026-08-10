// MyWorldEditor — Control-Center-shaped editor for a member's My Tools shelf
// and (optionally) their home widgets. Modeled on iOS Settings → Control
// Center: an "In Your World" inset card of what's included (⊖ badges + drag
// handles + a plain count), then "More Tools" grouped by section
// (⊕ badges), then an optional "Widgets" group (✓ toggles).
//
// The "In Your World" card lists LOOSE tools first, then each group's
// header followed by its members — the same order the sidebar shelf and the
// keycap grid render. Group UI is opt-in per call site (see the `groups`
// prop below): pass no onGroupsChange and this is exactly the flat editor it
// was before groups existed.
//
// There is no tool cap and no "full" state: 8 is what a member STARTS with,
// not a ceiling (see MY_TOOLS_SANITY_MAX in myTools.ts for why the hard cap
// was removed). Widgets DO still cap at WIDGETS_CAP — that one is a House
// layout constraint, not a nav-length one, and it bumps rather than blocks.
//
// Presentation only: no query, no save, no notion of whose record this is.
// The personal /dashboard/my-world page, its admin "Defaults for members"
// mode, and the first-run sheet all mount this same component and own
// persistence (and the tenant/member identity) themselves.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md
import type React from 'react';
import { Fragment, useMemo } from 'react';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Minus, Plus, Check, CircleSlash } from 'lucide-react';
import { NAV_SECTION_LABELS, type CatalogEntry, type NavSectionKey } from '@/lib/navigation/navCatalog';
import { WIDGETS_CAP, type Shelf, type ToolGroup } from '@/lib/navigation/myTools';
import {
  createGroup, deleteGroup, flattenShelf, groupIdOf, moveGroup, moveTool,
  renameGroup, setGroupCollapsed,
} from '@/lib/navigation/toolGroups';
import { MyWorldGroupRow } from './MyWorldGroupRow';
import { ToolRowMenu } from './ToolRowMenu';
import type { HomeWidget } from '@/lib/navigation/homeWidgets';

export interface MyWorldEditorProps {
  /** Every entry the viewer may use, already gated. Order is catalog order. */
  available: CatalogEntry[];
  /** LOOSE tool keys — the ones in no group — in the member's order. */
  tools: string[];
  onToolsChange: (next: string[]) => void;
  /**
   * The member's groups, in their order. Empty groups ARE rendered here —
   * the editor is the only surface that shows them, so it is the only place
   * a member can fill or delete one.
   *
   * Both props are OPTIONAL as a pair, and `onGroupsChange` is the switch:
   * omit it and the editor renders no group UI at all — no headers, no
   * `New Group` row, no per-row Move to… menu — exactly as omitting
   * `widgetOptions` suppresses the widgets section. That is how the admin
   * "Defaults for members" tab stays flat in Phase 1, where the stored shape
   * (gw_tenant_nav_prefs.default_tools, a text[]) cannot carry groups: a
   * visible New Group button wired to a no-op is a dead control, which is
   * worse than no control. With no handler, `groups` is ignored entirely.
   */
  groups?: ToolGroup[];
  onGroupsChange?: (next: ToolGroup[]) => void;
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
// Spec §7 requires 44pt minimum TARGETS, not 44pt rows with 24px controls
// inside them. The visual badge stays a 24px circle (the Control Center
// look); the button around it pads out to 44px and pulls that padding back
// with an equal negative margin, so the hit area grows without moving a
// single pixel of the layout.
const TAP_TARGET = 'shrink-0 p-2.5 -m-2.5 flex items-center justify-center disabled:opacity-40';
const BADGE = 'w-6 h-6 rounded-full flex items-center justify-center';

/** One row of IN YOUR SPACE. `entry` is undefined for a STORED key that is
 *  no longer in `available` — see the chosenRows comment below. */
function ChosenRow({ entryKey, entry, disabled, onRemove, menu }: {
  entryKey: string;
  entry?: CatalogEntry;
  disabled?: boolean;
  onRemove: (key: string) => void;
  /** Composed in by the editor — ChosenRow stays ignorant of groups. */
  menu?: React.ReactNode;
}) {
  // An unavailable row has no drag handle (there is nothing to arrange —
  // it renders nowhere else), so it must not be draggable either.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entryKey, disabled: disabled || !entry });
  const Icon = entry?.icon ?? CircleSlash;
  return (
    <li
      ref={setNodeRef}
      data-testid={entry ? undefined : 'my-world-unavailable'}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className="flex items-center gap-3 min-h-11 px-4 bg-card"
    >
      <button
        type="button"
        onClick={() => onRemove(entryKey)}
        disabled={disabled}
        aria-label={entry ? `Remove ${entry.label}` : `Remove unavailable tool ${entryKey}`}
        className={TAP_TARGET}
      >
        <span className={`${BADGE} bg-muted text-muted-foreground`}>
          <Minus className="w-4 h-4" aria-hidden />
        </span>
      </button>
      <Icon className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden />
      {entry ? (
        <span className={ROW_LABEL}>{entry.label}</span>
      ) : (
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] truncate text-muted-foreground">Unavailable</span>
          <span className={`block truncate ${CAPTION}`}>{entryKey}</span>
        </span>
      )}
      {menu}
      {entry && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Reorder ${entry.label}`}
          className={`${TAP_TARGET} text-muted-foreground touch-none`}
        >
          <span className={BADGE}>
            <GripVertical className="w-4 h-4" aria-hidden />
          </span>
        </button>
      )}
    </li>
  );
}

export function MyWorldEditor({
  available,
  tools,
  onToolsChange,
  groups: groupsProp,
  onGroupsChange,
  widgetOptions,
  widgets,
  onWidgetsChange,
  disabled,
}: MyWorldEditorProps) {
  const byKey = useMemo(() => new Map(available.map((e) => [e.key, e])), [available]);
  // One switch for the whole feature: no handler, no groups. Reading the
  // groups through it (rather than off the prop) means a caller that passes
  // `groups` without a handler cannot end up with tools filed into headers
  // it will never render — they would be silently invisible and unreachable.
  const groupsEnabled = !!onGroupsChange;
  const groups = useMemo(() => (groupsEnabled ? groupsProp ?? [] : []), [groupsEnabled, groupsProp]);
  // EVERY stored key gets a row, including one whose catalog entry is no
  // longer in `available` (module switched off, role gate closed, key
  // retired). Spec §5.2 keeps such a key in the RECORD on purpose so a
  // re-enabled module restores it — but the counter is computed from that
  // record, so filtering the row out left a member staring at a count that
  // disagreed with the rows in front of them. My World is the only surface
  // that can clear a stale key (HouseHome's mergeGridOrder deliberately
  // carries it through untouched), so without a row there is no exit at all.
  // The row is unlabelled-by-necessity — the catalog entry is gone, so the
  // key is all we have — and carries no drag handle, only a live ⊖.
  // (Before the cap was removed this was worse still: the stale key also ate
  // a slot, so the member saw "8 of 8 — your space is full" over five
  // visible rows with every ⊕ disabled and no ⊖ to press.)
  const shelf = useMemo<Shelf>(() => ({ tools, groups }), [tools, groups]);
  // Loose AND grouped, in render order. `More Tools` must exclude a grouped
  // key too, or a tool already filed away would be offered as addable and a
  // member could end up with two copies of it.
  const allChosen = useMemo(() => flattenShelf(shelf), [shelf]);
  const chosenKeys = useMemo(() => new Set(allChosen), [allChosen]);

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

  // Both lists are handed up on every change. moveTool/deleteGroup can touch
  // loose AND groups in a single operation, so emitting only one callback
  // would let the parent persist half an edit.
  const commit = (next: Shelf) => {
    if (disabled) return;
    onToolsChange(next.tools);
    onGroupsChange?.(next.groups);
  };

  // Every draggable id, in render order. A collapsed group's members are not
  // rendered, so they are not sortable either — listing them would give
  // dnd-kit ids with no node behind them.
  const sortableIds = useMemo(
    () => [...tools, ...groups.flatMap((g) => (g.collapsed ? [] : g.tools))],
    [tools, groups],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    // The band the tool was dropped INTO decides its new group; its index
    // within that band decides its position. Dropping onto a row in another
    // group is therefore a move, not just a reorder — which is what makes
    // drag equivalent to the Move to… menu rather than a weaker sibling.
    const targetGroupId = groupIdOf(shelf, overKey);
    const moved = moveTool(shelf, activeKey, targetGroupId);
    const band = targetGroupId === null
      ? moved.tools
      : moved.groups.find((g) => g.id === targetGroupId)?.tools ?? [];
    const from = band.indexOf(activeKey);
    const to = band.indexOf(overKey);
    if (from === -1 || to === -1) return;
    const reordered = arrayMove(band, from, to);
    commit(targetGroupId === null
      ? { ...moved, tools: reordered }
      : { ...moved, groups: moved.groups.map((g) => (g.id === targetGroupId ? { ...g, tools: reordered } : g)) });
  };

  const removeTool = (key: string) => commit({
    tools: shelf.tools.filter((k) => k !== key),
    groups: shelf.groups.map((g) => ({ ...g, tools: g.tools.filter((k) => k !== key) })),
  });

  const addTool = (key: string) => {
    if (disabled || chosenKeys.has(key)) return;
    // New tools land LOOSE, matching where a pin from All Tools lands. Only
    // the loose list changes, so this deliberately does NOT go through
    // commit() — firing onGroupsChange with an unchanged list would make the
    // parent save groups it has no reason to touch.
    onToolsChange([...tools, key]);
  };

  const handleNewGroup = () => commit(createGroup(shelf, 'New Group', crypto.randomUUID()));

  const widgetList = widgets ?? [];
  // Unchecking the LAST widget stores [], and resolveWidgets([]) re-expands
  // an empty pick to both role defaults (the home must never render zero
  // widgets) — so the checkbox visibly snapped straight back on. Lock the
  // last remaining pick instead of shipping a control that looks broken.
  const isLastWidget = (key: string) => widgetList.length === 1 && widgetList[0] === key;
  const toggleWidget = (key: string) => {
    if (disabled || !onWidgetsChange || isLastWidget(key)) return;
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
        <h2 className={GROUP_HEADER}>In Your World</h2>
        <div data-testid="my-world-chosen" className={CARD}>
          {allChosen.length === 0 && groups.length === 0 ? (
            <p className={`min-h-11 flex items-center px-4 ${CAPTION}`}>
              Nothing chosen yet — add tools below.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <ul>
                  {/* Keyed by the tool key alone: a `${key}-${index}` key
                      changes on every reorder, remounting each row and
                      killing dnd-kit's move transition. */}
                  {tools.map((key) => (
                    <ChosenRow
                      key={key}
                      entryKey={key}
                      entry={byKey.get(key)}
                      disabled={disabled}
                      onRemove={removeTool}
                      menu={groupsEnabled ? (
                        <ToolRowMenu
                          toolLabel={byKey.get(key)?.label ?? key}
                          currentGroupId={null}
                          groups={groups}
                          disabled={disabled}
                          onMoveTo={(target) => commit(moveTool(shelf, key, target))}
                          onNewGroup={handleNewGroup}
                        />
                      ) : undefined}
                    />
                  ))}
                  {/* Groups render after every loose row, mirroring the shelf
                      and the keycap grid. An EMPTY group still renders — see
                      the `groups` prop comment. */}
                  {groups.map((group, index) => (
                    <Fragment key={group.id}>
                      <MyWorldGroupRow
                        group={group}
                        count={group.tools.length}
                        disabled={disabled}
                        isFirst={index === 0}
                        isLast={index === groups.length - 1}
                        onRename={(id, name) => commit(renameGroup(shelf, id, name))}
                        onToggle={(id, collapsed) => commit(setGroupCollapsed(shelf, id, collapsed))}
                        onMove={(id, delta) => commit(moveGroup(shelf, id, delta))}
                        onDelete={(id) => commit(deleteGroup(shelf, id))}
                      />
                      {!group.collapsed && group.tools.map((key) => (
                        <ChosenRow
                          key={key}
                          entryKey={key}
                          entry={byKey.get(key)}
                          disabled={disabled}
                          onRemove={removeTool}
                          menu={
                            <ToolRowMenu
                              toolLabel={byKey.get(key)?.label ?? key}
                              currentGroupId={group.id}
                              groups={groups}
                              disabled={disabled}
                              onMoveTo={(target) => commit(moveTool(shelf, key, target))}
                              onNewGroup={handleNewGroup}
                            />
                          }
                        />
                      ))}
                    </Fragment>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
        {groupsEnabled && (
          <button
            type="button"
            onClick={handleNewGroup}
            disabled={disabled}
            className="w-full flex items-center gap-3 min-h-11 px-4 text-left text-primary disabled:opacity-40"
          >
            <Plus className="w-4 h-4" aria-hidden />
            <span className="text-[17px]">New Group</span>
          </button>
        )}
        <div className="flex items-center justify-between px-4 pt-1.5">
          <span className={CAPTION}>Home is always here.</span>
          {/* A plain count, not "n of 8". There is no denominator to report
              — see the header comment. Counts grouped tools too: they are
              just as chosen as the loose ones. */}
          <span data-testid="my-world-count" className={CAPTION}>
            {allChosen.length} {allChosen.length === 1 ? 'tool' : 'tools'}
          </span>
        </div>
      </section>

      <section>
        <h2 className={GROUP_HEADER}>More Tools</h2>
        <div data-testid="my-world-more" className="space-y-4">
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
                      disabled={disabled}
                      aria-label={`Add ${entry.label}`}
                      className={TAP_TARGET}
                    >
                      <span className={`${BADGE} bg-primary/10 text-primary`}>
                        <Plus className="w-4 h-4" aria-hidden />
                      </span>
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
          <div data-testid="my-world-widgets" className={CARD}>
            {widgetOptions.map((opt) => {
              const selected = widgetList.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleWidget(opt.key)}
                  disabled={disabled || isLastWidget(opt.key)}
                  aria-pressed={selected}
                  aria-label={opt.label}
                  className="w-full flex items-center gap-3 min-h-11 px-4 text-left disabled:opacity-40"
                >
                  <span className="flex-1">
                    <span className="block text-[17px]">{opt.label}</span>
                    <span className={`block ${CAPTION}`}>{opt.description}</span>
                  </span>
                  <span
                    className={`shrink-0 ${BADGE} ${
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
            <span data-testid="my-world-widget-count" className={CAPTION}>
              {widgetList.length} of {WIDGETS_CAP}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
