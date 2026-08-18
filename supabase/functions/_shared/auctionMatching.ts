// Saved-search matching for the Auctions module.
//
// Pure logic, no Deno APIs and no Supabase client, so the matcher job and the
// vitest suite share one implementation. This is the part of the product a
// buyer's attention depends on: a false positive wastes their time, and a
// false negative loses them the lot. It gets tests.
//
// Criteria arrive from a JSONB column that a form wrote, so nothing here
// trusts its input — parseCriteria is the only way in.

export type Modality =
  | 'mri' | 'ct' | 'c_arm' | 'ultrasound' | 'xray' | 'lab_analyzer' | 'other';

export interface Criteria {
  modality?: Modality[];
  manufacturer?: string[];
  model_contains?: string;
  year_min?: number;
  max_hammer_cents?: number;
  states?: string[];
  // Stored and round-tripped, but NOT yet applied by the matcher: distance
  // filtering needs a geocoder we have not chosen. Saved searches keep the
  // values so nothing is lost when it lands; the UI says so plainly.
  radius_miles?: number;
  origin_zip?: string;
  condition?: string[];
}

export interface MatchableLot {
  id: string;
  raw_title: string;
  modality: string | null;
  manufacturer: string | null;
  model: string | null;
  year_of_manufacture: number | null;
  condition_notes: string | null;
  current_bid_cents: number | null;
  normalization_confidence: number | null;
  // Denormalized from the parent auction; the lot itself has no location.
  auction_state: string | null;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .map((v) => v.trim());
  return out.length ? out : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

// Coerce whatever is in the JSONB column into a Criteria we can reason about.
// Unknown keys are dropped rather than carried, so a stale or hand-edited
// criteria blob can never smuggle a filter the matcher does not understand.
export function parseCriteria(raw: unknown): Criteria {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: Criteria = {};

  const modality = stringArray(src.modality);
  if (modality) out.modality = modality as Modality[];

  const manufacturer = stringArray(src.manufacturer);
  if (manufacturer) out.manufacturer = manufacturer;

  const modelContains = nonEmptyString(src.model_contains);
  if (modelContains) out.model_contains = modelContains;

  const yearMin = finiteNumber(src.year_min);
  if (yearMin !== undefined) out.year_min = yearMin;

  const maxHammer = finiteNumber(src.max_hammer_cents);
  if (maxHammer !== undefined) out.max_hammer_cents = maxHammer;

  const states = stringArray(src.states);
  if (states) out.states = states.map((s) => s.toUpperCase());

  const radius = finiteNumber(src.radius_miles);
  if (radius !== undefined) out.radius_miles = radius;

  const originZip = nonEmptyString(src.origin_zip);
  if (originZip) out.origin_zip = originZip;

  const condition = stringArray(src.condition);
  if (condition) out.condition = condition;

  return out;
}

const lower = (s: string) => s.toLowerCase();

// Every criterion the user set must hold. An unspecified criterion is not a
// filter — it means "I don't care", not "match anything loosely".
export function lotMatchesCriteria(lot: MatchableLot, criteria: Criteria): boolean {
  if (criteria.modality?.length) {
    if (!lot.modality) return false;
    if (!criteria.modality.map(lower).includes(lower(lot.modality))) return false;
  }

  if (criteria.manufacturer?.length) {
    if (!lot.manufacturer) return false;
    if (!criteria.manufacturer.map(lower).includes(lower(lot.manufacturer))) return false;
  }

  if (criteria.model_contains) {
    // Fall back to the raw title: the normalizer may not have split a model
    // out, but the house's own wording usually still carries it.
    const haystack = lower(lot.model ?? lot.raw_title ?? '');
    if (!haystack.includes(lower(criteria.model_contains))) return false;
  }

  if (criteria.year_min !== undefined) {
    // An unknown year cannot be shown to meet a minimum, so it does not.
    if (lot.year_of_manufacture === null) return false;
    if (lot.year_of_manufacture < criteria.year_min) return false;
  }

  if (criteria.max_hammer_cents !== undefined) {
    // No bids yet means nothing has exceeded the budget — still a candidate.
    if (lot.current_bid_cents !== null && lot.current_bid_cents > criteria.max_hammer_cents) {
      return false;
    }
  }

  if (criteria.states?.length) {
    if (!lot.auction_state) return false;
    if (!criteria.states.map((s) => s.toUpperCase()).includes(lot.auction_state.toUpperCase())) {
      return false;
    }
  }

  if (criteria.condition?.length) {
    if (!lot.condition_notes) return false;
    const notes = lower(lot.condition_notes);
    if (!criteria.condition.some((c) => notes.includes(lower(c)))) return false;
  }

  return true;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// How strongly a matching lot fits, 0–100, used to order a digest so the best
// candidate is the first thing someone reads.
//
// Trust is the largest single component on purpose: a lot the normalizer was
// unsure about should rank below a clean one even when both technically match,
// because acting on a bad parse costs a buyer far more than missing a lot.
export function scoreLot(lot: MatchableLot, criteria: Criteria): number {
  let score = 0;

  // Trust in the extraction: up to 40.
  score += 40 * clamp(lot.normalization_confidence ?? 0, 0, 1);

  // Specificity of the match: the more precisely the buyer named what they
  // wanted and the lot delivered it, the higher this climbs.
  if (criteria.modality?.length && lot.modality) score += 20;
  if (criteria.manufacturer?.length && lot.manufacturer) score += 15;
  if (criteria.model_contains && lot.model) score += 15;

  // Budget headroom: up to 10, scaled by how far under the cap the bid sits.
  if (criteria.max_hammer_cents !== undefined && criteria.max_hammer_cents > 0) {
    const bid = lot.current_bid_cents ?? 0;
    const headroom = clamp(1 - bid / criteria.max_hammer_cents, 0, 1);
    score += 10 * headroom;
  } else {
    score += 5;
  }

  return Number(clamp(score, 0, 100).toFixed(2));
}
