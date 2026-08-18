import { describe, expect, it } from 'vitest';
import {
  catalogBadge,
  deriveDisplayStatus,
  filterAuctions,
  groupAuctionsByMonth,
  primaryDate,
} from '../calendar';
import type { Auction } from '../types';

const NOW = new Date('2026-08-18T12:00:00Z');

function auction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: 'a1',
    source_id: 's1',
    external_id: null,
    title: 'Imaging equipment sale',
    location_city: null,
    location_state: null,
    opens_at: null,
    closes_at: null,
    catalog_url: null,
    catalog_released_at: null,
    status: 'announced',
    modality_focus: [],
    times_are_estimated: false,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('deriveDisplayStatus', () => {
  it('keeps cancelled regardless of dates', () => {
    const a = auction({ status: 'cancelled', opens_at: '2026-08-01T00:00:00Z' });
    expect(deriveDisplayStatus(a, NOW)).toBe('cancelled');
  });

  it('is closed once closes_at has passed', () => {
    const a = auction({ opens_at: '2026-08-01T00:00:00Z', closes_at: '2026-08-10T00:00:00Z' });
    expect(deriveDisplayStatus(a, NOW)).toBe('closed');
  });

  it('is open between opens_at and closes_at', () => {
    const a = auction({ opens_at: '2026-08-17T00:00:00Z', closes_at: '2026-08-25T00:00:00Z' });
    expect(deriveDisplayStatus(a, NOW)).toBe('open');
  });

  it('is catalog_posted after the catalog release but before open', () => {
    const a = auction({
      catalog_released_at: '2026-08-16T00:00:00Z',
      opens_at: '2026-08-22T00:00:00Z',
    });
    expect(deriveDisplayStatus(a, NOW)).toBe('catalog_posted');
  });

  it('falls back to the stored status when no date has arrived', () => {
    const a = auction({ status: 'announced', opens_at: '2026-09-10T00:00:00Z' });
    expect(deriveDisplayStatus(a, NOW)).toBe('announced');
  });
});

describe('primaryDate', () => {
  it('prefers opens_at, falls back to closes_at, then null', () => {
    expect(primaryDate(auction({ opens_at: '2026-09-01T00:00:00Z', closes_at: '2026-09-05T00:00:00Z' }))).toBe('2026-09-01T00:00:00Z');
    expect(primaryDate(auction({ closes_at: '2026-09-05T00:00:00Z' }))).toBe('2026-09-05T00:00:00Z');
    expect(primaryDate(auction())).toBeNull();
  });
});

describe('groupAuctionsByMonth', () => {
  it('groups by the primary date month, ascending, with dated groups before Date TBA', () => {
    const sept = auction({ id: 'sept', opens_at: '2026-09-10T00:00:00Z' });
    const aug = auction({ id: 'aug', opens_at: '2026-08-25T00:00:00Z' });
    const tba = auction({ id: 'tba' });
    const groups = groupAuctionsByMonth([sept, tba, aug]);
    expect(groups.map((g) => g.key)).toEqual(['2026-08', '2026-09', 'tba']);
    expect(groups[0].auctions.map((a) => a.id)).toEqual(['aug']);
    expect(groups[2].label).toBe('Date TBA');
  });

  it('sorts auctions inside a month by primary date', () => {
    const late = auction({ id: 'late', opens_at: '2026-09-20T00:00:00Z' });
    const early = auction({ id: 'early', opens_at: '2026-09-02T00:00:00Z' });
    const groups = groupAuctionsByMonth([late, early]);
    expect(groups[0].auctions.map((a) => a.id)).toEqual(['early', 'late']);
  });
});

describe('catalogBadge', () => {
  it('reports posted when the catalog release has passed', () => {
    const a = auction({ catalog_released_at: '2026-08-15T00:00:00Z' });
    expect(catalogBadge(a, NOW)).toEqual({ kind: 'posted', at: '2026-08-15T00:00:00Z' });
  });

  it('reports expected for a scheduled future release', () => {
    const a = auction({ catalog_released_at: '2026-08-30T00:00:00Z' });
    expect(catalogBadge(a, NOW)).toEqual({ kind: 'expected', at: '2026-08-30T00:00:00Z' });
  });

  it('estimates ~3 days before open when no release date is known', () => {
    const a = auction({ opens_at: '2026-09-10T00:00:00Z' });
    expect(catalogBadge(a, NOW)).toEqual({ kind: 'estimate', at: '2026-09-07T00:00:00.000Z' });
  });

  it('returns null when nothing is known or the auction already opened', () => {
    expect(catalogBadge(auction(), NOW)).toBeNull();
    expect(catalogBadge(auction({ opens_at: '2026-08-17T00:00:00Z' }), NOW)).toBeNull();
  });
});

describe('filterAuctions', () => {
  const a1 = auction({ id: 'a1', source_id: 's1', modality_focus: ['mri', 'ct'] });
  const a2 = auction({ id: 'a2', source_id: 's2', modality_focus: [] });

  it('filters by source', () => {
    expect(filterAuctions([a1, a2], { sourceId: 's2' }).map((a) => a.id)).toEqual(['a2']);
  });

  it('filters by modality focus, treating an empty focus as general (always shown)', () => {
    expect(filterAuctions([a1, a2], { modality: 'mri' }).map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(filterAuctions([a1, a2], { modality: 'ultrasound' }).map((a) => a.id)).toEqual(['a2']);
  });

  it('passes everything through with no filters', () => {
    expect(filterAuctions([a1, a2], {})).toHaveLength(2);
  });
});
