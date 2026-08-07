// All-State — Layer 1 (global editorial canon) types.
// Mirrors supabase/migrations/20260808120000_all_state_layer1_canon.sql.
// Hand-written rather than pulled from Database types because
// src/integrations/supabase/types.ts is stale (it predates gw_tenants).

export type VerificationStatus = 'draft' | 'pending_verification' | 'verified' | 'stale';
export type Confidence = 'verified' | 'official_source' | 'unverified';
export type PayableTo = 'state_association' | 'director' | 'school' | 'unknown';

export interface AllStateState {
  id: string;
  name: string;
  abbreviation: string;
  slug: string;
  region: string | null;
  active: boolean;
}

export interface AllStateOrganization {
  id: string;
  state_id: string;
  name: string;
  acronym: string | null;
  website_url: string | null;
  logo_url: string | null;
  description: string | null;
}

export interface AllStateProgram {
  id: string;
  state_id: string;
  organization_id: string | null;
  name: string;
  slug: string;
  season: string;
  lineage_key: string;
  school_level: 'elementary' | 'middle' | 'high' | 'collegiate' | 'other' | null;
  ensemble_type: string | null;
  description: string | null;
  active: boolean;
  verification_status: VerificationStatus;
  verified_at: string | null;
}

/** Every externally-sourced fact carries these. Rendered as a quiet badge. */
export interface Provenance {
  source_id: string | null;
  source_url: string | null;
  retrieved_at: string | null;
  confidence: Confidence;
}

export interface AllStateDate extends Provenance {
  id: string;
  program_id: string;
  date_type: string;
  title: string;
  start_at: string | null;
  end_at: string | null;
  /** True when the source published a date with no clock time. */
  all_day: boolean;
  timezone: string;
  description: string | null;
  sort_order: number;
}

export interface AllStateRequirement extends Provenance {
  id: string;
  program_id: string;
  category: string;
  title: string;
  description: string | null;
  structured_data: Record<string, unknown>;
  sort_order: number;
}

export interface AllStateRepertoire {
  id: string;
  program_id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  publisher: string | null;
  catalog_number: string | null;
  voicing: string | null;
  purpose: string | null;
  movement: string | null;
  notes: string | null;
  source_url: string | null;
  sort_order: number;
}

export interface AllStateFee extends Provenance {
  id: string;
  program_id: string;
  fee_type: string;
  amount_cents: number | null;
  currency: string;
  /**
   * The load-bearing field. `state_association` means GleeWorld only DISPLAYS
   * this fee — there is no checkout behind it. Only a fee the tenant actually
   * collects routes through gw_student_fees.
   */
  payable_to: PayableTo;
  description: string | null;
}

export interface AllStateDocument {
  id: string;
  program_id: string;
  title: string;
  document_type: string | null;
  url: string;
  published_at: string | null;
  retrieved_at: string | null;
  sort_order: number;
}

export interface AllStateVoicePart {
  id: string;
  program_id: string;
  code: string;
  label: string;
  sort_order: number;
}

/** Everything the public state page needs, in one shape. */
export interface ProgramDetail {
  program: AllStateProgram;
  organization: AllStateOrganization | null;
  dates: AllStateDate[];
  requirements: AllStateRequirement[];
  repertoire: AllStateRepertoire[];
  fees: AllStateFee[];
  documents: AllStateDocument[];
  voiceParts: AllStateVoicePart[];
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  verified: 'Verified',
  official_source: 'Official source',
  unverified: 'Pending verification',
};

export function formatMoney(cents: number | null, currency = 'usd'): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Renders a state deadline in the timezone the STATE published it in, not the
 * viewer's. A Georgia deadline of 11:59pm ET must not read as 8:59pm to a
 * director in California — gw_events has no timezone column precisely because
 * everything else in GleeWorld is local-time, but a published external
 * deadline is different.
 */
export function formatInSourceZone(
  iso: string | null,
  timeZone: string,
  allDay = false,
): string {
  if (!iso) return 'Date not published';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      // Omit the time entirely when the source published none, rather than
      // rendering a midnight we invented.
      ...(allDay ? {} : { timeStyle: 'short' as const }),
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

/** "Sept 15 – Sept 17, 2026" for multi-day events; single date otherwise. */
export function formatDateRange(
  start: string | null,
  end: string | null,
  timeZone: string,
  allDay = false,
): string {
  const from = formatInSourceZone(start, timeZone, allDay);
  if (!end || !start || end === start) return from;
  return `${from} – ${formatInSourceZone(end, timeZone, allDay)}`;
}
