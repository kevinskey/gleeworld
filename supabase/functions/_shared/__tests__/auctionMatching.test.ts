import { describe, expect, it } from 'vitest';
import {
  lotMatchesCriteria,
  parseCriteria,
  scoreLot,
  type MatchableLot,
} from '../auctionMatching.ts';

function lot(overrides: Partial<MatchableLot> = {}): MatchableLot {
  return {
    id: 'l1',
    raw_title: 'Siemens Magnetom Avanto 1.5T MRI',
    modality: 'mri',
    manufacturer: 'Siemens',
    model: 'Magnetom Avanto',
    year_of_manufacture: 2014,
    condition_notes: 'Working, removed from service',
    current_bid_cents: 5_000_00,
    normalization_confidence: 0.9,
    auction_state: 'GA',
    ...overrides,
  };
}

describe('parseCriteria', () => {
  it('returns empty criteria for junk input', () => {
    expect(parseCriteria(null)).toEqual({});
    expect(parseCriteria('nonsense')).toEqual({});
    expect(parseCriteria(42)).toEqual({});
  });

  it('keeps recognised fields and drops unknown ones', () => {
    const parsed = parseCriteria({
      modality: ['mri'],
      manufacturer: ['Siemens'],
      model_contains: 'Avanto',
      year_min: 2010,
      max_hammer_cents: 100000,
      states: ['GA'],
      condition: ['working'],
      sql_injection: "'; DROP TABLE lots; --",
    });
    expect(parsed).toEqual({
      modality: ['mri'],
      manufacturer: ['Siemens'],
      model_contains: 'Avanto',
      year_min: 2010,
      max_hammer_cents: 100000,
      states: ['GA'],
      condition: ['working'],
    });
  });

  it('drops array entries that are not strings', () => {
    expect(parseCriteria({ modality: ['mri', 7, null] })).toEqual({ modality: ['mri'] });
  });

  it('drops empty arrays and blank strings rather than storing dead filters', () => {
    expect(parseCriteria({ modality: [], model_contains: '   ', states: [] })).toEqual({});
  });

  it('ignores numeric fields that are not finite numbers', () => {
    expect(parseCriteria({ year_min: 'soon', max_hammer_cents: NaN })).toEqual({});
  });

  it('uppercases state codes so casing never silently breaks a filter', () => {
    expect(parseCriteria({ states: ['ga', 'Al'] })).toEqual({ states: ['GA', 'AL'] });
  });
});

describe('lotMatchesCriteria', () => {
  it('matches everything when no criteria are set', () => {
    expect(lotMatchesCriteria(lot(), {})).toBe(true);
  });

  it('matches on modality', () => {
    expect(lotMatchesCriteria(lot(), { modality: ['mri', 'ct'] })).toBe(true);
    expect(lotMatchesCriteria(lot(), { modality: ['ct'] })).toBe(false);
  });

  it('refuses to match an un-normalized lot against a modality filter', () => {
    expect(lotMatchesCriteria(lot({ modality: null }), { modality: ['mri'] })).toBe(false);
  });

  it('matches manufacturer case-insensitively', () => {
    expect(lotMatchesCriteria(lot(), { manufacturer: ['siemens'] })).toBe(true);
    expect(lotMatchesCriteria(lot(), { manufacturer: ['GE'] })).toBe(false);
  });

  it('matches model_contains against the model', () => {
    expect(lotMatchesCriteria(lot(), { model_contains: 'avanto' })).toBe(true);
    expect(lotMatchesCriteria(lot(), { model_contains: 'espree' })).toBe(false);
  });

  it('falls back to the raw title when the model was never parsed out', () => {
    const l = lot({ model: null });
    expect(lotMatchesCriteria(l, { model_contains: 'avanto' })).toBe(true);
  });

  it('applies year_min, and treats an unknown year as not qualifying', () => {
    expect(lotMatchesCriteria(lot(), { year_min: 2010 })).toBe(true);
    expect(lotMatchesCriteria(lot(), { year_min: 2018 })).toBe(false);
    expect(lotMatchesCriteria(lot({ year_of_manufacture: null }), { year_min: 2010 })).toBe(false);
  });

  it('applies max_hammer_cents against the current bid', () => {
    expect(lotMatchesCriteria(lot(), { max_hammer_cents: 10_000_00 })).toBe(true);
    expect(lotMatchesCriteria(lot(), { max_hammer_cents: 1_000_00 })).toBe(false);
  });

  it('keeps a lot with no bids yet — nothing has exceeded the budget', () => {
    const l = lot({ current_bid_cents: null });
    expect(lotMatchesCriteria(l, { max_hammer_cents: 1_000_00 })).toBe(true);
  });

  it('matches the auction state', () => {
    expect(lotMatchesCriteria(lot(), { states: ['GA', 'FL'] })).toBe(true);
    expect(lotMatchesCriteria(lot(), { states: ['TX'] })).toBe(false);
    expect(lotMatchesCriteria(lot({ auction_state: null }), { states: ['GA'] })).toBe(false);
  });

  it('matches condition keywords inside the condition notes', () => {
    expect(lotMatchesCriteria(lot(), { condition: ['working'] })).toBe(true);
    expect(lotMatchesCriteria(lot(), { condition: ['for parts'] })).toBe(false);
    expect(lotMatchesCriteria(lot({ condition_notes: null }), { condition: ['working'] })).toBe(false);
  });

  it('requires every specified criterion, not just one', () => {
    expect(lotMatchesCriteria(lot(), { modality: ['mri'], manufacturer: ['GE'] })).toBe(false);
  });
});

describe('scoreLot', () => {
  it('scores a confident, fully-matching lot near the top', () => {
    const score = scoreLot(lot(), {
      modality: ['mri'], manufacturer: ['Siemens'], model_contains: 'Avanto',
      max_hammer_cents: 20_000_00,
    });
    expect(score).toBeGreaterThan(85);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('never exceeds 100 or drops below 0', () => {
    const score = scoreLot(lot({ normalization_confidence: 1, current_bid_cents: 0 }), {
      modality: ['mri'], manufacturer: ['Siemens'], model_contains: 'Avanto',
      max_hammer_cents: 100_000_00,
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('ranks a poorly-parsed lot below a well-parsed one', () => {
    const criteria = { modality: ['mri' as const] };
    const confident = scoreLot(lot({ normalization_confidence: 0.95 }), criteria);
    const shaky = scoreLot(lot({ normalization_confidence: 0.3 }), criteria);
    expect(confident).toBeGreaterThan(shaky);
  });

  it('rewards headroom under the budget', () => {
    const criteria = { max_hammer_cents: 10_000_00 };
    const cheap = scoreLot(lot({ current_bid_cents: 1_000_00 }), criteria);
    const nearBudget = scoreLot(lot({ current_bid_cents: 9_900_00 }), criteria);
    expect(cheap).toBeGreaterThan(nearBudget);
  });

  it('gives an un-normalized lot no trust points', () => {
    const score = scoreLot(lot({ normalization_confidence: null }), {});
    expect(score).toBeLessThan(50);
  });

  it('rounds to two decimals so the numeric(5,2) column stores it exactly', () => {
    const score = scoreLot(lot({ normalization_confidence: 0.333 }), {});
    expect(score).toBe(Number(score.toFixed(2)));
  });
});
