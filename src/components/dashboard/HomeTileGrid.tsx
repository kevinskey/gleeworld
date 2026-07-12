// Keycap app grid with iOS-style jiggle editing, extracted from HouseHome.
// View mode: primary tiles as keycap links, rest behind a "More" expander.
// Edit mode (long-press a tile or tap Edit): tiles jiggle; tapping a
// primary tile (or its – badge) demotes it to More, tapping a More tile
// (or its + badge) appends it to primary, dragging reorders primary.
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
import { Minus, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Destination } from '@/lib/navigation/appDestinations';
import { NAV_SECTION_LABELS, type NavSectionKey } from '@/lib/navigation/navCatalog';

interface HomeTileGridProps {
  primary: Destination[];
  overflow: Destination[];
  onSave: (order: string[]) => Promise<boolean>;
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP_PX = 10;

// Sections rendered as their own "More" group, in display order. A tile
// whose section isn't in this list (or has no section at all) falls
// through to the catch-all group below instead of vanishing — see the
// draftOverflow filter in the edit-mode More renderer.
const MORE_SECTIONS: NavSectionKey[] = ['music', 'teach', 'make', 'plan', 'reach', 'money', 'people', 'admin'];

function KeycapFace({ tile, editing }: { tile: Destination; editing: boolean }) {
  const Icon = tile.icon;
  return (
    <>
      <span className={
        'w-full aspect-square bg-card border border-border shadow-[0_2px_0_hsl(var(--border))] flex items-center justify-center'
        + (editing ? '' : ' transition-transform motion-reduce:transition-none group-active:translate-y-px group-active:shadow-none')
      }>
        <Icon className="w-5 h-5 text-foreground" />
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
        className="w-full flex flex-col items-center gap-1 text-xs text-muted-foreground min-h-[44px] animate-jiggle motion-reduce:animate-none"
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
        className="w-full flex flex-col items-center gap-1 text-xs text-muted-foreground min-h-[44px] animate-jiggle motion-reduce:animate-none"
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

export function HomeTileGrid({ primary, overflow, onSave }: HomeTileGridProps) {
  const { toast } = useToast();
  // draft === null → view mode; draft = ordered primary keys while editing.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = draft !== null;

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

  const done = async () => {
    if (!draft) return;
    setSaving(true);
    const ok = await onSave(draft);
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
          <button type="button" onClick={() => setDraft(primary.map((t) => t.key))}
            className="text-sm text-muted-foreground min-h-[44px]">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className={saving ? 'pointer-events-none opacity-60' : undefined}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={draftPrimary.map((t) => t.key)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
                {draftPrimary.map((t, i) => (
                  <SortableTile key={t.key} tile={t} index={i}
                    onRemove={(key) => setDraft((d) => (d ? d.filter((k) => k !== key) : d))} />
                ))}
              </div>
            </SortableContext>
            {draftPrimary.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Your grid is empty — add apps back from below.
              </p>
            )}
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-4 mb-2">More</div>
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
                      <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
                        {tiles.map((t, i) => (
                          <AddTile key={t.key} tile={t} index={i}
                            onAdd={(key) => setDraft((d) => (d && !d.includes(key) ? [...d, key] : d))} />
                        ))}
                      </div>
                    </div>
                  ))}
                {/* Catch-all: a tile whose section is unset OR not one of
                    MORE_SECTIONS (e.g. a future grid-surface entry like
                    'today') still lands here instead of being unpinnable. */}
                {draftOverflow.filter((t) => !t.section || !MORE_SECTIONS.includes(t.section)).length > 0 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
                    {draftOverflow.filter((t) => !t.section || !MORE_SECTIONS.includes(t.section)).map((t, i) => (
                      <AddTile key={t.key} tile={t} index={i}
                        onAdd={(key) => setDraft((d) => (d && !d.includes(key) ? [...d, key] : d))} />
                    ))}
                  </div>
                )}
              </>
            )}
          </DndContext>
        </div>
      ) : (
        <>
          {primary.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Your grid is empty — tap Edit to add apps.
            </p>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
              {primary.map((t) => (
                <Link key={t.key} to={t.to}
                  onPointerDown={onTilePointerDown}
                  onPointerMove={onTilePointerMove}
                  onPointerUp={clearPress}
                  onPointerCancel={clearPress}
                  onContextMenu={(e) => e.preventDefault()}
                  className="flex flex-col items-center gap-1 text-xs text-muted-foreground group min-h-[44px]">
                  <KeycapFace tile={t} editing={false} />
                </Link>
              ))}
            </div>
          )}
          {overflow.length > 0 && (
            <details className="text-sm mt-4" open={primary.length === 0 || undefined}>
              <summary className="text-muted-foreground cursor-pointer py-2 min-h-[44px] flex items-center">
                More ({overflow.length})
              </summary>
              <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2 pt-2">
                {overflow.map((t) => (
                  <Link key={t.key} to={t.to}
                    className="flex flex-col items-center gap-1 text-xs text-muted-foreground min-h-[44px]">
                    <span className="w-full aspect-square bg-card border border-border flex items-center justify-center">
                      <t.icon className="w-5 h-5 text-foreground" />
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
