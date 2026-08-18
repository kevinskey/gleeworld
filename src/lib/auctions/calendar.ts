// Pure calendar logic for the Auctions module: what state an auction is in,
// when its catalog lands, and how the list groups. No Supabase, no React —
// this is the part the tests pin down.
import type { Auction, AuctionStatus, Modality } from './types';

// Several houses post inventory only ~3 days before an auction opens, so an
// unknown catalog date is estimated from the open date rather than left blank.
export const CATALOG_LEAD_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function time(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

// The date the calendar sorts and groups on: when it opens, or failing that
// when it closes.
export function primaryDate(auction: Auction): string | null {
  return auction.opens_at ?? auction.closes_at ?? null;
}

// Stored status is what an admin typed; display status is what the clock says.
// Cancelled always wins — a cancelled auction never reads as "open".
export function deriveDisplayStatus(auction: Auction, now: Date = new Date()): AuctionStatus {
  if (auction.status === 'cancelled') return 'cancelled';

  const nowMs = now.getTime();
  const opens = time(auction.opens_at);
  const closes = time(auction.closes_at);
  const catalog = time(auction.catalog_released_at);

  if (closes !== null && closes <= nowMs) return 'closed';
  if (opens !== null && opens <= nowMs) return 'open';
  if (catalog !== null && catalog <= nowMs) return 'catalog_posted';
  return auction.status;
}

export interface CatalogBadge {
  // posted: the catalog is out. expected: a known future release date.
  // estimate: derived from the open date, so it must render as approximate.
  kind: 'posted' | 'expected' | 'estimate';
  at: string;
}

// The actionable alert for a buyer: when can I actually see the lots?
export function catalogBadge(auction: Auction, now: Date = new Date()): CatalogBadge | null {
  const nowMs = now.getTime();
  const catalog = time(auction.catalog_released_at);

  if (catalog !== null && auction.catalog_released_at) {
    return {
      kind: catalog <= nowMs ? 'posted' : 'expected',
      at: auction.catalog_released_at,
    };
  }

  const opens = time(auction.opens_at);
  if (opens === null || opens <= nowMs) return null;

  return { kind: 'estimate', at: new Date(opens - CATALOG_LEAD_DAYS * DAY_MS).toISOString() };
}

export interface AuctionMonthGroup {
  key: string;
  label: string;
  auctions: Auction[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Grouped by month in UTC so the grouping is stable regardless of where the
// viewer is; undated auctions collect in a trailing "Date TBA" group.
export function groupAuctionsByMonth(auctions: Auction[]): AuctionMonthGroup[] {
  const groups = new Map<string, AuctionMonthGroup>();

  for (const auction of auctions) {
    const iso = primaryDate(auction);
    const ms = time(iso);
    let key = 'tba';
    let label = 'Date TBA';

    if (ms !== null) {
      const d = new Date(ms);
      const month = d.getUTCMonth();
      key = `${d.getUTCFullYear()}-${String(month + 1).padStart(2, '0')}`;
      label = `${MONTH_NAMES[month]} ${d.getUTCFullYear()}`;
    }

    const group = groups.get(key) ?? { key, label, auctions: [] };
    group.auctions.push(auction);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.auctions.sort((a, b) => (time(primaryDate(a)) ?? 0) - (time(primaryDate(b)) ?? 0));
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key === 'tba') return 1;
    if (b.key === 'tba') return -1;
    return a.key.localeCompare(b.key);
  });
}

export interface AuctionFilters {
  sourceId?: string;
  modality?: Modality;
}

// A house with no declared modality focus is a general sale — it can hold
// anything, so it is never filtered out by modality.
export function filterAuctions(auctions: Auction[], filters: AuctionFilters): Auction[] {
  return auctions.filter((auction) => {
    if (filters.sourceId && auction.source_id !== filters.sourceId) return false;
    if (filters.modality) {
      const focus = auction.modality_focus ?? [];
      if (focus.length > 0 && !focus.includes(filters.modality)) return false;
    }
    return true;
  });
}
