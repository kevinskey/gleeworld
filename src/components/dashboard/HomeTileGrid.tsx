// Keycap app grid with iOS-style jiggle editing, extracted from HouseHome.
// View mode: primary tiles as keycap links, rest behind a "More" expander.
// The primary tiles arrive already partitioned into BANDS — FAVORITES first,
// then the member's ungrouped keycaps under no heading, then one heading per
// group they named. Same set as the sidebar shelf.
// FAVORITES is a reserved group (see favorites.ts), not the loose list: apps
// in it are page-only, while loose apps still render as sidebar rows. That
// split is what lets "put this on the page" and "put this in my left nav" be
// two different gestures. In edit mode Favorites survives being empty, so it
// can always be dropped into.
// Edit mode (long-press a tile or tap Edit): tiles jiggle; tapping a
// primary tile (or its – badge) demotes it to More, tapping a More tile
// (or its + badge) appends it to primary, dragging reorders ACROSS the whole
// grid — any app can be dragged to any slot, the first one included. A drag
// that crosses a heading also re-files that tool into the band it was
// dropped in, so the heading stays honest; the My World editor's "Move to…"
// menu writes the same groups and remains the way to do it without a drag.
// Done persists once via onSave; Esc/Cancel reverts. Tiles never navigate
// while editing. Whole-tile taps keep the ≥44px target; badges are the
// visual affordance.
// Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, PointerSensor, closestCenter, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Minus, Plus, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bandDestinations, type Destination, type TileBand } from '@/lib/navigation/appDestinations';
import { NAV_SECTION_LABELS, type NavSectionKey } from '@/lib/navigation/navCatalog';
import { planDrop, FAVORITES_DROP_ID } from '@/lib/navigation/gridDrag';
import { FAVORITES_GROUP_ID, FAVORITES_GROUP_NAME } from '@/lib/navigation/favorites';

interface HomeTileGridProps {
  /** Favorites first, then loose tiles (no heading), then one band per group. */
  bands: TileBand[];
  overflow: Destination[];
  /**
   * `order` is the flat grid order the member sees; `membership` maps each
   * of those keys to the band it ended up in (null = loose). Membership is
   * passed because a drag may now cross a heading — saving order alone would
   * re-split the arrangement by the member's previous filing.
   */
  onSave: (order: string[], membership: Record<string, string | null>) => Promise<boolean>;
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

// One band: its heading above its run of keycaps. Shared by view and edit
// mode so the two can never drift apart.
//
// Every band carries its own name; the loose band has none, as before. The
// FAVORITES band gets its heading from the reserved group like any other,
// which is why there is no special case here.
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

// The empty Favorites row in edit mode. Without it, dragging the last
// favorite into a group would delete the row and with it the only place to
// drop one back — see FAVORITES_DROP_ID.
function EmptyFavoritesZone() {
  const { setNodeRef, isOver } = useDroppable({ id: FAVORITES_DROP_ID });
  return (
    <div ref={setNodeRef}
      className={'border border-dashed px-3 py-6 text-center text-sm text-muted-foreground transition-colors '
        + (isOver ? 'border-primary bg-primary/5 text-primary' : 'border-border')}>
      Drag an app here to keep it at the top.
    </div>
  );
}

export function HomeTileGrid({ bands, overflow, onSave }: HomeTileGridProps) {
  const { toast } = useToast();
  // draft === null → view mode; draft = ordered primary keys while editing.
  const [draft, setDraft] = useState<string[] | null>(null);
  // Re-filings made by dragging across a heading this session: key → the
  // group it now belongs to (null = the loose band). Empty until a drag
  // crosses a band boundary, so an edit that only reorders within a band
  // still saves exactly the membership the member already had.
  const [refiled, setRefiled] = useState<Record<string, string | null>>({});
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
  // Band membership as the DRAFT sees it: stored membership, overridden by
  // anything this edit session dragged across a heading. Rebuilt rather than
  // patched so a tile dragged out of a group is dropped from that group's
  // tools (→ it bands loose) and picked up by exactly one other.
  //
  // Favorites is seeded into this list even when the member has never used
  // it: it is created lazily, so on a first drag into the empty Favorites
  // row there is no such group to re-file INTO, and the tile would silently
  // band loose instead — landing in the sidebar, the exact opposite of what
  // dropping it in Favorites means.
  const draftGroups = useMemo(() => {
    const withFavorites = bandGroups.some((g) => g.id === FAVORITES_GROUP_ID)
      ? bandGroups
      : [{ id: FAVORITES_GROUP_ID, name: FAVORITES_GROUP_NAME, tools: [] as string[] }, ...bandGroups];
    return withFavorites.map((g) => ({
      ...g,
      tools: [
        ...g.tools.filter((k) => refiled[k] === undefined || refiled[k] === g.id),
        ...Object.keys(refiled).filter((k) => refiled[k] === g.id && !g.tools.includes(k)),
      ],
    }));
  }, [bandGroups, refiled]);
  // Re-derived from the draft on every edit, never from the `bands` prop: a
  // removed tile must take its now-empty heading with it, and a tile added
  // from More must land in the LOOSE band rather than under whichever
  // heading it happened to follow in the flat draft.
  const draftBands = draft ? bandDestinations(draftPrimary, draftGroups) : bands;
  // Favorites is the one band that survives being empty WHILE EDITING —
  // bandDestinations drops empty bands (a heading over nothing is noise),
  // but dragging the last favorite into a group would then take the drop
  // target with it and there would be no way back. It stays dropped in view
  // mode, where there is nothing to drop and nothing to explain.
  const editBands: TileBand[] = draftBands.some((b) => b.groupId === FAVORITES_GROUP_ID)
    ? draftBands
    : [{ groupId: FAVORITES_GROUP_ID, name: FAVORITES_GROUP_NAME, tiles: [] }, ...draftBands];
  // key → the band it currently renders in. Drag needs this to tell an
  // ordinary within-band reorder from a drop that crossed a heading.
  const bandIdOfKey = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const b of draftBands) for (const t of b.tiles) m.set(t.key, b.groupId);
    return m;
  }, [draftBands]);

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

  // Cancel/Esc reverts the whole session — order AND any re-filing a drag
  // across a heading made, which is only ever a draft until Done.
  const cancel = () => { setDraft(null); setRefiled({}); };

  // Esc cancels the edit session and reverts.
  useEffect(() => {
    if (!editing || saving) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDraft(null); setRefiled({}); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, saving]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  // A drag may land anywhere on the grid, band boundaries included — that is
  // the whole point: any app can be dragged to the very first slot without
  // first re-filing it in the My World editor. Dropping onto a tile in
  // another band ALSO re-files the dragged tile into that band, so the
  // heading it now sits under keeps telling the truth (and the sidebar
  // shelf, which reads the same groups, agrees). Dropping onto a loose tile
  // un-files it.
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeKey = String(active.id);
    const plan = planDrop(activeKey, String(over.id), bandIdOfKey);
    if ('refileTo' in plan) {
      const to = plan.refileTo ?? null;
      setRefiled((r) => ({ ...r, [activeKey]: to }));
    }
    setDraft((d) => (d ? plan.reorder(d) : d));
  };

  // No ceiling. This used to refuse a tap once the draft reached a `cap`
  // prop (the retired MY_TOOLS_CAP, lowered by HouseHome for stored keys
  // with no keycap),
  // because sanitizeTools would otherwise silently drop the tail on save.
  // sanitizeTools no longer truncates at 8 — see MY_TOOLS_SANITY_MAX in
  // myTools.ts — so there is nothing left to protect the member from, and a
  // refused tap on their own grid is now the worse outcome. A member may
  // fill the grid with every app they have; it wraps onto more rows.
  // Both drop any re-filing this session made for the key: a tile taken off
  // the grid and put back should land loose, exactly as a tile arriving from
  // More always has — not under a heading it was dragged to three taps ago.
  const forgetRefiling = (key: string) => setRefiled(({ [key]: _dropped, ...rest }) => rest);
  const addTile = (key: string) => {
    if (!draft || draft.includes(key)) return;
    forgetRefiling(key);
    setDraft((d) => (d && !d.includes(key) ? [...d, key] : d));
  };
  const removeTile = (key: string) => {
    forgetRefiling(key);
    setDraft((d) => (d ? d.filter((k) => k !== key) : d));
  };

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
    // Membership travels WITH the order, because a drag can now change it —
    // saving the order alone would re-split the new arrangement by the OLD
    // filing and snap every cross-band move straight back.
    const membership: Record<string, string | null> = {};
    for (const b of draftBands) for (const t of b.tiles) membership[t.key] = b.groupId;
    const ok = await onSave(draftBands.flatMap((b) => b.tiles.map((t) => t.key)), membership);
    setSaving(false);
    if (ok) {
      setDraft(null);
      setRefiled({});
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
            <button type="button" onClick={cancel} disabled={saving} className="text-muted-foreground min-h-[44px] disabled:opacity-50">
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
          {/* ONE DndContext over every band, not one per band. Collision
              detection is DndContext-scoped, so this is what makes "drag any
              app anywhere, including the very first slot" possible at all
              (Kevin's call, 2026-08-20 — the earlier per-band contexts made
              a tile a prisoner of its heading, and the only way to move one
              to the top was a detour through the My World editor). A drop
              that crosses a heading re-files the tile into that band; see
              onDragEnd. The My World editor's "Move to…" menu still exists
              and still writes the same groups, so the two agree. */}
          <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              {editBands.map((band) => (
                <BandSection key={band.groupId ?? '__loose'} band={band}>
                  {band.groupId === FAVORITES_GROUP_ID && band.tiles.length === 0 ? (
                    <EmptyFavoritesZone />
                  ) : (
                    <SortableContext items={band.tiles.map((t) => t.key)} strategy={rectSortingStrategy}>
                      <div className={GRID_CLASSES}>
                        {band.tiles.map((t, i) => (
                          <SortableTile key={t.key} tile={t} index={i} onRemove={removeTile} />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </BandSection>
              ))}
            </DndContext>
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
