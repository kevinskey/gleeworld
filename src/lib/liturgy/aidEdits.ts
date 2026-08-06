import type { AidEntry, PanelId } from './worshipAid';

/**
 * Editing a worship aid without detaching it from the Mass.
 *
 * The panels are GENERATED from the plan. Making them editable could have
 * meant snapshotting them on first edit, but then a hymn swapped in the
 * planner would never reach the aid and nobody would notice until it printed.
 * So edits are stored as a DIFF against the generated content: hide this,
 * rename that, insert a score here. Anything untouched still tracks the plan.
 *
 * The consequence to keep in mind: an edit is addressed by KEY, and a key is
 * derived from the entry's label. If a plan change removes the entry a user
 * renamed, the rename has nothing to attach to and is dropped rather than
 * applied to the wrong thing. That is the safe direction to fail.
 */

/** A block the user added, which exists only on the aid. */
export interface InsertedBlock {
  id: string;
  kind: 'text' | 'score' | 'spacer';
  /** kind 'text' — free prose, e.g. a note about the collection. */
  text?: string;
  /** kind 'score' — an engraved setting dropped into the flow. */
  imageUrl?: string;
  /** kind 'spacer' — blank height in inches. */
  height?: number;
}

export interface PanelEdits {
  /** Keys of generated entries the user removed from this panel. */
  hidden?: string[];
  /** Desired order, by key. Keys absent from this list keep their generated
   *  position; this only records what the user actually moved. */
  order?: string[];
  /** Text overrides, by key. */
  text?: Record<string, Partial<Pick<AidEntry, 'label' | 'title' | 'credit' | 'summary'>>>;
  /** Blocks the user inserted, in the order they should appear. */
  inserts?: InsertedBlock[];
  /** Extra space in inches AFTER a given key — how a user opens up a panel
   *  that reads tight, without changing the whole panel's spacing. */
  gaps?: Record<string, number>;
}

export type AidEditsByPanel = Partial<Record<PanelId, PanelEdits>>;

/** A block ready to render: a generated entry or an inserted one. */
export interface RenderedBlock {
  key: string;
  entry: AidEntry;
  inserted: boolean;
  /** Extra space to leave after this block, in inches. */
  gapAfter: number;
}

/**
 * Stable key for a generated entry.
 *
 * Label plus occurrence, not index: a Mass with two Communion hymns has two
 * entries labelled COMMUNION, and an index-based key would re-point every
 * edit below an entry the moment the plan gained or lost one. Occurrence
 * survives that — COMMUNION#2 is still the second Communion hymn.
 *
 * Entries with no label (a notice, an image) key off their content instead,
 * so they are addressable too.
 */
export function entryKey(entry: AidEntry, seen: Map<string, number>): string {
  const base = entry.label
    || (entry.notice ? 'NOTICE' : entry.imageUrl ? 'IMAGE' : 'BLOCK');
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : `${base}#${n}`;
}

const MAX_GAP_IN = 3;

/** Clamp a stored gap: negative would overlap the next block, and more than a
 *  few inches is a blank panel rather than spacing. */
function safeGap(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(MAX_GAP_IN, raw));
}

function insertedEntry(block: InsertedBlock): AidEntry {
  switch (block.kind) {
    case 'text':
      return { label: '', summary: block.text ?? '' };
    case 'score':
      return { label: '', imageUrl: block.imageUrl ?? null };
    case 'spacer':
      return { label: '' };
  }
}

/**
 * Merge a panel's generated entries with the user's edits.
 *
 * Order of operations matters: hide first, then apply text overrides, then
 * append inserts, then reorder. Reordering last means a user-chosen order
 * governs the final list including inserts, rather than inserts always
 * landing at the end.
 */
export function applyPanelEdits(entries: AidEntry[], edits: PanelEdits | undefined): RenderedBlock[] {
  const seen = new Map<string, number>();
  const hidden = new Set(edits?.hidden ?? []);
  const textEdits = edits?.text ?? {};
  const gaps = edits?.gaps ?? {};

  const generated: RenderedBlock[] = [];
  for (const entry of entries) {
    const key = entryKey(entry, seen);
    if (hidden.has(key)) continue;
    const override = textEdits[key];
    generated.push({
      key,
      entry: override ? { ...entry, ...override } : entry,
      inserted: false,
      gapAfter: safeGap(gaps[key]),
    });
  }

  const inserted: RenderedBlock[] = (edits?.inserts ?? []).map((b) => ({
    key: b.id,
    entry: insertedEntry(b),
    inserted: true,
    // A spacer IS its gap — it has no content of its own.
    gapAfter: b.kind === 'spacer' ? safeGap(b.height ?? 0.25) : safeGap(gaps[b.id]),
  }));

  const all = [...generated, ...inserted];
  const order = edits?.order;
  if (!order || order.length === 0) return all;

  // Anything the order does not mention keeps its relative position at the
  // end, so a plan that gains an entry after the user reordered does not
  // vanish — it appears, rather than being silently dropped.
  const byKey = new Map(all.map((b) => [b.key, b]));
  const ordered: RenderedBlock[] = [];
  for (const key of order) {
    const block = byKey.get(key);
    if (block) { ordered.push(block); byKey.delete(key); }
  }
  return [...ordered, ...byKey.values()];
}

/** Move a key one place up or down within a panel's current order. */
export function reorderKeys(current: string[], key: string, dir: -1 | 1): string[] {
  const i = current.indexOf(key);
  if (i < 0) return current;
  const j = i + dir;
  if (j < 0 || j >= current.length) return current;
  const next = [...current];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
