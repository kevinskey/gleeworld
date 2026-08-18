// Turning auction catalog prose into structured lot fields.
//
// Auction listings are written by whoever happened to be typing that day:
// "MAGNETOM AVANTO 1.5T (2014) w/ coils, quench pipe incl." Regex loses to
// that, so an LLM does the extraction — but nothing it returns reaches the
// database until it has passed the validator below. Pure logic only; the
// HTTP call and the provider live elsewhere.

export const MODALITIES = [
  'mri', 'ct', 'c_arm', 'ultrasound', 'xray', 'lab_analyzer', 'other',
] as const;
export type Modality = (typeof MODALITIES)[number];

// PINNED. This string is the exact prefix of every normalization request, so
// DeepSeek's context caching can hit on it. Editing it invalidates the cache
// for every subsequent call — change it deliberately, not casually.
export const NORMALIZATION_SYSTEM_PROMPT = `You extract structured data from used medical and diagnostic equipment auction listings.

For each lot you are given, return what the listing actually states. Never guess, never infer from what is typical, and never fill a field from outside knowledge. If the listing does not state something, return null for it.

Fields:
- modality: one of "mri", "ct", "c_arm", "ultrasound", "xray", "lab_analyzer", "other", or null if unclear.
- manufacturer: the maker, e.g. "Siemens", "GE", "Philips", "Canon", "Hologic". Null if not stated.
- model: the model or product name, e.g. "Magnetom Avanto", "Lightspeed VCT". Exclude the manufacturer name. Null if not stated.
- year: four-digit year of manufacture between 1950 and 2100, or null.
- serial: serial number exactly as written, or null.
- condition_notes: a short factual summary of stated condition, in the listing's own terms. Null if condition is not described.
- confidence: your confidence from 0 to 1 that the fields above are correct. Use a low value when the listing is vague, ambiguous, or lists several different machines in one lot.

Respond with JSON only, in exactly this shape:
{"lots":[{"id":"<the id given>","modality":null,"manufacturer":null,"model":null,"year":null,"serial":null,"condition_notes":null,"confidence":0.0}]}

Include one entry for every lot id you were given, and use only those ids.`;

export interface NormalizationInput {
  id: string;
  raw_title: string;
  raw_text: string | null;
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

// Batched: several lots per request, because output size is small and the
// per-request overhead dominates at this volume.
export function buildNormalizationMessages(lots: NormalizationInput[]): ChatMessage[] {
  const body = lots
    .map((l) => {
      const text = l.raw_text?.trim() ? `\n${l.raw_text.trim()}` : '';
      return `--- lot id: ${l.id}\n${l.raw_title}${text}`;
    })
    .join('\n\n');

  return [
    { role: 'system', content: NORMALIZATION_SYSTEM_PROMPT },
    { role: 'user', content: `Extract these ${lots.length} lot(s):\n\n${body}` },
  ];
}

export interface NormalizedLot {
  id: string;
  modality: Modality | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  serial: string | null;
  condition_notes: string | null;
  confidence: number;
}

export interface ParseResult {
  valid: NormalizedLot[];
  // Human-readable reasons, logged so a bad prompt or a drifting model shows
  // up in the job output rather than silently thinning the results.
  invalid: string[];
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// Models still wrap JSON in markdown fences now and then, even when asked not
// to. Unwrapping is cheap; losing a whole batch to three backticks is not.
function stripFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

// The gate. Anything that does not survive this is never written.
export function parseNormalizationResponse(raw: string, expectedIds: Set<string>): ParseResult {
  const valid: NormalizedLot[] = [];
  const invalid: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    return { valid, invalid: ['response was not valid JSON'] };
  }

  const lots = (parsed as { lots?: unknown })?.lots;
  if (!Array.isArray(lots)) {
    return { valid, invalid: ['response had no "lots" array'] };
  }

  for (const entry of lots) {
    if (!entry || typeof entry !== 'object') {
      invalid.push('entry was not an object');
      continue;
    }
    const e = entry as Record<string, unknown>;

    const id = typeof e.id === 'string' ? e.id : '';
    if (!expectedIds.has(id)) {
      invalid.push(`unknown lot id ${JSON.stringify(e.id)}`);
      continue;
    }

    const confidence = e.confidence;
    if (typeof confidence !== 'number' || !Number.isFinite(confidence)
        || confidence < 0 || confidence > 1) {
      invalid.push(`${id}: confidence missing or out of range`);
      continue;
    }

    let modality: Modality | null = null;
    if (e.modality !== null && e.modality !== undefined) {
      if (typeof e.modality !== 'string' || !MODALITIES.includes(e.modality as Modality)) {
        invalid.push(`${id}: unknown modality ${JSON.stringify(e.modality)}`);
        continue;
      }
      modality = e.modality as Modality;
    }

    let year: number | null = null;
    if (e.year !== null && e.year !== undefined) {
      if (typeof e.year !== 'number' || !Number.isInteger(e.year) || e.year < 1950 || e.year > 2100) {
        invalid.push(`${id}: implausible year ${JSON.stringify(e.year)}`);
        continue;
      }
      year = e.year;
    }

    const manufacturer = nullableString(e.manufacturer);
    const model = nullableString(e.model);
    const serial = nullableString(e.serial);
    const conditionNotes = nullableString(e.condition_notes);
    if ([manufacturer, model, serial, conditionNotes].some((v) => v === undefined)) {
      invalid.push(`${id}: a text field was not a string`);
      continue;
    }

    valid.push({
      id,
      modality,
      manufacturer: manufacturer as string | null,
      model: model as string | null,
      year,
      serial: serial as string | null,
      condition_notes: conditionNotes as string | null,
      confidence,
    });
  }

  return { valid, invalid };
}

export type ReviewStatus = 'auto' | 'needs_review';

// Below the threshold a lot waits for a human instead of entering everyone's
// search results, per the module's rule about unverified extractions.
export function decideReviewStatus(confidence: number, threshold: number): ReviewStatus {
  return confidence >= threshold ? 'auto' : 'needs_review';
}

// DeepSeek peak hours are 01:00–04:00 and 06:00–10:00 UTC; off-peak is half
// price. Verified against api-docs.deepseek.com/quick_start/pricing on
// 2026-08-18. The batch job is scheduled off-peak on purpose.
export function isPeakPricing(now: Date): boolean {
  const h = now.getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10);
}

export interface TokenUsage {
  prompt_tokens: number;
  cached_prompt_tokens: number;
  completion_tokens: number;
}

// Off-peak microcents per token for deepseek-v4-flash (1 cent = 1,000,000
// microcents). $0.007 / $0.22 / $0.66 per 1M tokens respectively.
const RATE_CACHE_HIT = 0.7;
const RATE_CACHE_MISS = 22;
const RATE_OUTPUT = 66;

export function estimateCostMicrocents(usage: TokenUsage, peak: boolean): number {
  // prompt_tokens is the total; the cached portion is billed at the cheaper
  // rate and must not be charged twice.
  const cached = Math.max(0, Math.min(usage.cached_prompt_tokens, usage.prompt_tokens));
  const fresh = Math.max(0, usage.prompt_tokens - cached);

  const base =
    cached * RATE_CACHE_HIT +
    fresh * RATE_CACHE_MISS +
    Math.max(0, usage.completion_tokens) * RATE_OUTPUT;

  return Math.round(base * (peak ? 2 : 1));
}
