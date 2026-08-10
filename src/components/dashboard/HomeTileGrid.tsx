// Keycap app grid with iOS-style jiggle editing, extracted from HouseHome.
// View mode: primary tiles as keycap links, rest behind a "More" expander.
// The primary tiles arrive already partitioned into BANDS — the member's
// loose keycaps first under no heading, then one heading per group they
// named. Same set as the sidebar shelf, and now the same structure.
// Edit mode (long-press a tile or tap Edit): tiles jiggle; tapping a
// primary tile (or its – badge) demotes it to More, tapping a More tile
// (or its + badge) appends it to primary, dragging reorders WITHIN a band.
// Moving a tool between groups is the My World editor's job, not a gesture
// here — see the per-band DndContext below.
// Done persists once via onSave; Esc/Cancel reverts. Tiles never navigate
// while editing. Whole-tile taps keep the ≥44px target; badges are the
// visual affordance.
// Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Minus, Plus, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bandDestinations, type Destination, type TileBand } from '@/lib/navigation/appDestinations';
import { NAV_SECTION_LABELS, type NavSectionKey } from '@/lib/navigation/navCatalog';

interface HomeTileGridProps {
  /** Loose tiles first (groupId null, no heading), then one band per group. */
  bands: TileBand[];
  overflow: Destination[];
  onSave: (order: string[]) => Promise<boolean>;
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP_PX = 10;

const GRID_CLASSES = 'grid grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2';

// Sections rendered as their own "More" group, in display order. A tile
// whose section isn't in this list (or has no section at all) falls
// through to the catch-all group below instead of vanishing — see the
// draftOverflow filter in the edit-mode More renderer.
const MORE_SECTIONS: NavSectionKey[] = ['church', 'music', 'teach', 'make', 'plan', 'reach', 'money', 'people', 'admin'];

// A first pass painted each tile's full card in its `tone` — with every
// app pulling an unrelated color (plus one nav entry using a solid
// bg-primary "hero" tone meant for a single sidebar row, not a whole
// grid tile) the grid read as an arbitrary wall of clashing color
// instead of a considered palette. Dialed back: the card stays neutral
// (matches every other card surface in the app) and color lives only in
// a small icon chip — same "colored chip on a white card" pattern
// already used elsewhere (e.g. music library ScoreCard). Still distinct
// per app, still bigger than the original 20px icon, just calmer.
const DEFAULT_TONE = 'bg-muted text-foreground';

// Chip/icon/label sizes scale up at breakpoints because the grid's column
// count grows too slowly for the viewport (4→6→8) — desktop tiles end up
// ~170px wide, so a fixed 36px chip reads as a tiny blob in the middle of
// a big white card. Roughly: mobile 36px chip, iPad 56px, laptop 64px,
// desktop 80px. Icon and label track proportionally so tiles read as
// intentionally-designed cards at every width.
const CHIP_SIZE = 'w-9 h-9 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20';
const ICON_SIZE = 'w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10';
const LABEL_SIZE = 'text-xs md:text-sm lg:text-base';

function KeycapFace({ tile, editing }: { tile: Destination; editing: boolean }) {
  const Icon = tile.icon;
  return (
    <>
      <span className={
        'w-full aspect-square bg-card border border-border shadow-[0_2px_0_hsl(var(--border))] flex items-center justify-center'
        + (editing ? '' : ' transition-transform motion-reduce:transition-none group-active:translate-y-px group-active:shadow-none')
      }>
        <span className={`${CHIP_SIZE} rounded-xl md:rounded-2xl flex items-center justify-center ${tile.tone || DEFAULT_TONE}`}>
          <Icon className={ICON_SIZE} />
        </span>
      </span>
      {tile.label}
    </>
  );
}

function SortableTile({ tile, index, onRemove }: {
  tile: Destination; index: number; onRemove: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.key });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className="relative touch-none">
      <button type="button" onClick={() => onRemove(tile.key)}
        aria-label={`Remove ${tile.label} from grid`}
        className={`w-full flex flex-col items-center gap-1 md:gap-1.5 ${LABEL_SIZE} text-muted-foreground min-h-[44px] animate-jiggle motion-reduce:animate-none`}
        style={{ animationDelay: `${(index % 4) * 75}ms` }}>
        <KeycapFace tile={tile} editing />
      </button>
      <span aria-hidden="true"
        className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-background border border-border flex items-center justify-center pointer-events-none">
        <Minus className="w-4 h-4 text-destructive" />
      </span>
    </div>
  );
}

// A single More-group tile in edit mode: jiggling keycap + Plus badge,
// tapping either adds the tile back to the primary grid. Shared by the
// per-section groups and the unlisted-section catch-all group so the two
// never drift out of sync.
function AddTile({ tile, index, onAdd }: { tile: Destination; index: number; onAdd: (key: string) => void }) {
  return (
    <div className="relative">
      <button type="button"
        onClick={() => onAdd(tile.key)}
        aria-label={`Add ${tile.label} to grid`}
        className={`w-full flex flex-col items-center gap-1 md:gap-1.5 ${LABEL_SIZE} text-muted-foreground min-h-[44px] animate-jiggle motion-reduce:animate-none`}
        style={{ animationDelay: `${(index % 4) * 75}ms` }}>
        <KeycapFace tile={tile} editing />
      </button>
      <span aria-hidden="true"
        className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-background border border-border flex items-center justify-center pointer-events-none">
        <Plus className="w-4 h-4 text-primary" />
      </span>
    </div>
  );
}

// One band: the member's heading (absent for the loose band, which renders
// with no heading at all) above its run of keycaps. Shared by view and edit
// mode so the two can never drift apart.
function BandSection({ band, children }: { band: TileBand; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      {band.name && (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          {band.name}
        </h3>
      )}
      {children}
    </section>
  );
}

export function HomeTileGrid({ bands, overflow, onSave }: HomeTileGridProps) {
  const { toast } = useToast();
  // draft === null → view mode; draft = ordered primary keys while editing.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = draft !== null;

  // The flat grid set, in render order — every seed, budget and save still
  // speaks flat keys; the bands are how it is laid out, not what it is.
  const primary = useMemo(() => bands.flatMap((b) => b.tiles), [bands]);
  // Membership only, in band order — enough for bandDestinations to
  // re-partition the edit draft. Collapse state is a sidebar concern.
  const bandGroups = useMemo(
    () => bands
      .filter((b): b is TileBand & { groupId: string; name: string } => b.groupId !== null)
      .map((b) => ({ id: b.groupId, name: b.name, tools: b.tiles.map((t) => t.key) })),
    [bands],
  );

  const byKey = useMemo(
    () => new Map([...primary, ...overflow].map((t) => [t.key, t])),
    [primary, overflow],
  );
  // `draft ?` (not `editing ?`) so TS narrows string[] | null.
  const draftPrimary = draft
    ? draft.map((k) => byKey.get(k)).filter((t): t is Destination => t !== undefined)
    : primary;
  const draftOverflow = draft
    ? [...primary, ...overflow].filter((t) => !draft.includes(t.key))
    : overflow;
  // Re-derived from the draft on every edit, never from the `bands` prop: a
  // removed tile must take its now-empty heading with it, and a tile added
  // from More must land in the LOOSE band rather than under whichever
  // heading it happened to follow in the flat draft.
  const draftBands = draft ? bandDestinations(draftPrimary, bandGroups) : bands;

  // Long-press any view-mode tile to enter edit mode; cancelled by
  // movement past the slop (i.e. a scroll) or release.
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const clearPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressOrigin.current = null;
  };
  const onTilePointerDown = (e: React.PointerEvent) => {
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = window.setTimeout(() => setDraft(primary.map((t) => t.key)), LONG_PRESS_MS);
  };
  const onTilePointerMove = (e: React.PointerEvent) => {
    if (!pressOrigin.current) return;
    const dx = e.clientX - pressOrigin.current.x;
    const dy = e.clientY - pressOrigin.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_SLOP_PX) clearPress();
  };
  useEffect(() => clearPress, []);

  // Esc cancels the edit session and reverts.
  useEffect(() => {
    if (!editing || saving) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDraft(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, saving]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDraft((d) => {
      if (!d) return d;
      return arrayMove(d, d.indexOf(String(active.id)), d.indexOf(String(over.id)));
    });
  };

  // No ceiling. This used to refuse a tap once the draft reached a `cap`
  // prop (the retired MY_TOOLS_CAP, lowered by HouseHome for stored keys
  // with no keycap),
  // because sanitizeTools would otherwise silently drop the tail on save.
  // sanitizeTools no longer truncates at 8 — see MY_TOOLS_SANITY_MAX in
  // myTools.ts — so there is nothing left to protect the member from, and a
  // refused tap on their own grid is now the worse outcome. A member may
  // fill the grid with every app they have; it wraps onto more rows.
  const addTile = (key: string) => {
    if (!draft || draft.includes(key)) return;
    setDraft((d) => (d && !d.includes(key) ? [...d, key] : d));
  };
  const removeTile = (key: string) => setDraft((d) => (d ? d.filter((k) => k !== key) : d));

  // View-mode keycap. Extracted verbatim from the old primary.map(...) body
  // so banding changed the layout and nothing else — long-press, drag
  // cession and tone handling are untouched.
  const renderTile = (t: Destination) => (
    <Link key={t.key} to={t.to}
      // Browsers treat <a> as natively draggable, which
      // hijacked pointerdown before the long-press timer
      // could fire — tenants tried to rearrange tiles and
      // got a URL preview icon instead. Cede the pointer
      // stream so the long-press-to-edit + drag flow works.
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={onTilePointerDown}
      onPointerMove={onTilePointerMove}
      onPointerUp={clearPress}
      onPointerCancel={clearPress}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex flex-col items-center gap-1 md:gap-1.5 ${LABEL_SIZE} text-muted-foreground group min-h-[44px]`}>
      <KeycapFace tile={t} editing={false} />
    </Link>
  );

  const done = async () => {
    if (!draft) return;
    setSaving(true);
    // The order the member SEES, not the raw draft. addTile appends to the
    // flat draft, but an ungrouped tile RENDERS in the leading loose band —
    // so the raw draft would hand the caller an order the grid never showed
    // (that tile trailing the last group instead of leading the loose run).
    const ok = await onSave(draftBands.flatMap((b) => b.tiles.map((t) => t.key)));
    setSaving(false);
    if (ok) {
      setDraft(null);
    } else {
      // Keep the edited layout locally; user can retry Done.
      toast({ title: 'Could not save your layout', description: 'Check your connection and tap Done again.', variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 min-h-[44px]">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Apps</span>
        {editing ? (
          <span className="flex items-center gap-3 text-sm">
            <button type="button" onClick={() => setDraft(null)} disabled={saving} className="text-muted-foreground min-h-[44px] disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={done} disabled={saving} className="font-semibold text-primary min-h-[44px]">
              {saving ? 'Saving…' : 'Done'}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setDraft(primary.map((t) => t.key))}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-colors min-h-[44px] sm:min-h-[36px]"
            title="Rearrange or add tiles"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit apps
          </button>
        )}
      </div>

      {editing ? (
        <div className={saving ? 'pointer-events-none opacity-60' : undefined}>
          <div className="space-y-4">
            {draftBands.map((band) => (
              <BandSection key={band.groupId ?? '__loose'} band={band}>
                {/* One DndContext PER BAND, not one wrapping the whole grid.
                    Collision detection is DndContext-scoped, so this is what
                    makes "a drag reorders WITHIN a band" structurally true
                    rather than a runtime check someone has to remember.
                    Re-filing a tool belongs to the My World editor's
                    "Move to…" menu; a drag that did it here would be a
                    second, less discoverable grouping UI competing with it. */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={band.tiles.map((t) => t.key)} strategy={rectSortingStrategy}>
                    <div className={GRID_CLASSES}>
                      {band.tiles.map((t, i) => (
                        <SortableTile key={t.key} tile={t} index={i} onRemove={removeTile} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </BandSection>
            ))}
          </div>
          {draftPrimary.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              Your grid is empty — add apps back from below.
            </p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2 mt-4 mb-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">More</span>
          </div>
          {draftOverflow.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everything is on your grid.</p>
          ) : (
            <>
              {MORE_SECTIONS
                .map((s) => ({ s, tiles: draftOverflow.filter((t) => t.section === s) }))
                .filter(({ tiles }) => tiles.length > 0)
                .map(({ s, tiles }) => (
                  <div key={s}>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground/70 mt-3 mb-2">
                      {NAV_SECTION_LABELS[s]}
                    </div>
                    <div className={GRID_CLASSES}>
                      {tiles.map((t, i) => (
                        <AddTile key={t.key} tile={t} index={i}
                          onAdd={addTile} />
                      ))}
                    </div>
                  </div>
                ))}
              {/* Catch-all: a tile whose section is unset OR not one of
                  MORE_SECTIONS (e.g. a future grid-surface entry like
                  'today') still lands here instead of being unpinnable. */}
              {draftOverflow.filter((t) => !t.section || !MORE_SECTIONS.includes(t.section)).length > 0 && (
                <div className={GRID_CLASSES}>
                  {draftOverflow.filter((t) => !t.section || !MORE_SECTIONS.includes(t.section)).map((t, i) => (
                    <AddTile key={t.key} tile={t} index={i}
                      onAdd={addTile} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {primary.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Your grid is empty — tap Edit to add apps.
            </p>
          ) : (
            <div className="space-y-4">
              {bands.map((band) => (
                <BandSection key={band.groupId ?? '__loose'} band={band}>
                  <div className={GRID_CLASSES}>
                    {band.tiles.map(renderTile)}
                  </div>
                </BandSection>
              ))}
            </div>
          )}
          {overflow.length > 0 && (
            <details className="text-sm mt-4" open={primary.length === 0 || undefined}>
              <summary className="text-muted-foreground cursor-pointer py-2 min-h-[44px] flex items-center">
                More ({overflow.length})
              </summary>
              <div className={`${GRID_CLASSES} pt-2`}>
                {overflow.map((t) => (
                  <Link key={t.key} to={t.to}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    className={`flex flex-col items-center gap-1 md:gap-1.5 ${LABEL_SIZE} text-muted-foreground min-h-[44px]`}>
                    <span className="w-full aspect-square bg-card border border-border flex items-center justify-center">
                      <span className={`${CHIP_SIZE} rounded-xl md:rounded-2xl flex items-center justify-center ${t.tone || DEFAULT_TONE}`}>
                        <t.icon className={ICON_SIZE} />
                      </span>
                    </span>
                    {t.label}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
