// Giving (peer-to-peer fundraising) data layer.
//
// The PUBLIC reads all go through SECURITY DEFINER RPCs rather than direct
// table reads. That is deliberate and load-bearing: a /give/<slug> link gets
// shared into a text message and opened by a stranger on gleeworld.org with
// no x-tenant-slug context, so anon_tenant_id() would resolve to nothing and
// RLS would return an empty page. The RPCs also hand back a hand-picked
// column list, which keeps donor_email and participants' manage tokens off
// the wire entirely.
//
// The ADMIN reads/writes are ordinary table calls — RLS scopes them to the
// signed-in staffer's own tenant.

import { supabase } from '@/integrations/supabase/client';

// These RPCs and tables post-date the generated Database types, so the
// typed client does not know their names yet. Casting once here keeps the
// `as any` contained to this module instead of scattered through the UI.
const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase.rpc as unknown as (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(name, args);
const table = (name: string) =>
  (supabase.from as unknown as (n: string) => ReturnType<typeof supabase.from>)(name);

export interface PublicFundraiser {
  id: string;
  slug: string;
  title: string;
  story: string | null;
  hero_image_url: string | null;
  goal_cents: number;
  raised_cents: number;
  donor_count: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  status: 'live' | 'closed';
  allow_participants: boolean;
  participant_count: number;
  fee_cover_enabled: boolean;
  fee_cover_bps: number;
  min_gift_cents: number;
  max_gift_cents: number;
  suggested_amounts_cents: number[];
  tax_deductible: boolean;
  is_indexable: boolean;
  tenant_slug: string;
  tenant_name: string;
}

export interface PublicParticipant {
  slug: string;
  display_name: string;
  grade_label: string | null;
  photo_url: string | null;
  goal_cents: number;
  raised_cents: number;
  donor_count: number;
  group_name: string | null;
}

export interface PublicParticipantDetail extends PublicParticipant {
  id: string;
  story: string | null;
  video_url: string | null;
}

export interface PublicDonation {
  donor_label: string;
  /** NULL when the donor chose to hide the amount — the gift still shows. */
  amount_cents: number | null;
  message: string | null;
  created_at: string;
  participant_name: string | null;
}

export interface PublicGroup {
  id: string;
  name: string;
  goal_cents: number;
  raised_cents: number;
  donor_count: number;
}

export async function fetchFundraiser(slug: string): Promise<PublicFundraiser | null> {
  const { data, error } = await rpc('gw_giving_fundraiser', { p_slug: slug });
  if (error) throw error;
  const rows = data as PublicFundraiser[] | null;
  return rows?.[0] ?? null;
}

export async function fetchParticipants(
  slug: string,
  opts: { search?: string; limit?: number; offset?: number } = {},
): Promise<PublicParticipant[]> {
  const { data, error } = await rpc('gw_giving_participants', {
    p_slug: slug,
    p_search: opts.search ?? null,
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  });
  if (error) throw error;
  return (data as PublicParticipant[] | null) ?? [];
}

export async function fetchParticipant(slug: string, participantSlug: string): Promise<PublicParticipantDetail | null> {
  const { data, error } = await rpc('gw_giving_participant', {
    p_slug: slug,
    p_participant_slug: participantSlug,
  });
  if (error) throw error;
  const rows = data as PublicParticipantDetail[] | null;
  return rows?.[0] ?? null;
}

export async function fetchGroups(slug: string): Promise<PublicGroup[]> {
  const { data, error } = await rpc('gw_giving_groups', { p_slug: slug });
  if (error) throw error;
  return (data as PublicGroup[] | null) ?? [];
}

export async function fetchTopDonations(
  slug: string,
  participantSlug?: string | null,
  limit = 10,
): Promise<PublicDonation[]> {
  const { data, error } = await rpc('gw_giving_top_donations', {
    p_slug: slug,
    p_participant_slug: participantSlug ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as PublicDonation[] | null) ?? [];
}

export async function fetchStateTotals(slug: string): Promise<{ donor_state: string; raised_cents: number; donor_count: number }[]> {
  const { data, error } = await rpc('gw_giving_state_totals', { p_slug: slug });
  if (error) throw error;
  return (data as { donor_state: string; raised_cents: number; donor_count: number }[] | null) ?? [];
}

export interface DonateArgs {
  fundraiser_slug: string;
  participant_slug?: string | null;
  amount_cents: number;
  cover_fee: boolean;
  donor_name: string;
  donor_email: string;
  message?: string;
  is_anonymous: boolean;
  hide_amount: boolean;
}

/** Hands off to Stripe Checkout on the tenant's own connected account.
 *  Returns the hosted-checkout URL for the caller to redirect to. */
export async function startDonation(args: DonateArgs): Promise<string> {
  const { data, error } = await supabase.functions.invoke('donate-checkout', { body: args });
  if (error) {
    // Edge functions surface the JSON body on a non-2xx via context.
    let message = 'Could not start your donation.';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch { /* fall back to the generic message */ }
    throw new Error(message);
  }
  const url = (data as { url?: string })?.url;
  if (!url) throw new Error('Could not start your donation.');
  return url;
}

// ── Participant self-service (token, no account) ───────────────────────────

export interface ManagedParticipant {
  fundraiser_slug: string;
  fundraiser_title: string;
  slug: string;
  display_name: string;
  grade_label: string | null;
  photo_url: string | null;
  story: string | null;
  video_url: string | null;
  goal_cents: number;
  raised_cents: number;
  is_public: boolean;
  consent_granted_at: string | null;
}

export async function fetchManagedParticipant(token: string): Promise<ManagedParticipant | null> {
  const { data, error } = await rpc('gw_giving_participant_by_token', { p_token: token });
  if (error) throw error;
  const rows = data as ManagedParticipant[] | null;
  return rows?.[0] ?? null;
}

export async function updateManagedParticipant(
  token: string,
  patch: { story?: string; goal_cents?: number; photo_url?: string; consent?: boolean; consent_by?: string },
): Promise<void> {
  const { data, error } = await rpc('gw_giving_update_participant_by_token', {
    p_token: token,
    p_story: patch.story ?? null,
    p_goal_cents: patch.goal_cents ?? null,
    p_photo_url: patch.photo_url ?? null,
    p_consent: patch.consent ?? null,
    p_consent_by: patch.consent_by ?? null,
  });
  if (error) throw error;
  const result = data as { error?: string } | null;
  if (result?.error) throw new Error(result.error);
}

// ── Admin ──────────────────────────────────────────────────────────────────

// gw_fundraisers predates this feature — it was already in the database as an
// item-sale fundraiser (gw_fundraiser_items, payout_cadence) and we adopted it
// rather than stand up a second competing "fundraiser" table. Its column names
// differ from the ones the public RPCs return, and the RPCs alias them back:
//     name → title, description → story, cover_image → hero_image_url,
//     opens_at → starts_at, closes_at → ends_at, status 'active' → 'live'
// This admin path talks to the table directly, so it is the one place that has
// to speak the table's vocabulary. Translation is confined to these functions.
type FundraiserStatus = 'draft' | 'live' | 'closed';

interface FundraiserRow {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  goal_cents: number | null;
  opens_at: string | null;
  closes_at: string | null;
  status: string;
  raised_cents: number;
  donor_count: number;
  allow_participants: boolean;
  default_participant_goal_cents: number;
  fee_cover_enabled: boolean;
  fee_cover_bps: number;
  min_gift_cents: number;
  max_gift_cents: number;
  suggested_amounts_cents: number[] | null;
  tax_deductible: boolean;
  is_indexable: boolean;
  currency: string;
  created_at: string;
}

export interface AdminFundraiser extends Omit<PublicFundraiser, 'tenant_slug' | 'tenant_name' | 'participant_count' | 'status'> {
  tenant_id: string;
  status: FundraiserStatus;
  default_participant_goal_cents: number;
  created_at: string;
}

const toAdmin = (r: FundraiserRow): AdminFundraiser => ({
  id: r.id,
  tenant_id: r.tenant_id,
  slug: r.slug,
  title: r.name,
  story: r.description,
  hero_image_url: r.cover_image,
  goal_cents: r.goal_cents ?? 0,
  raised_cents: r.raised_cents,
  donor_count: r.donor_count,
  currency: r.currency,
  starts_at: r.opens_at,
  ends_at: r.closes_at,
  status: r.status === 'active' ? 'live' : (r.status as FundraiserStatus),
  allow_participants: r.allow_participants,
  default_participant_goal_cents: r.default_participant_goal_cents,
  fee_cover_enabled: r.fee_cover_enabled,
  fee_cover_bps: r.fee_cover_bps,
  min_gift_cents: r.min_gift_cents,
  max_gift_cents: r.max_gift_cents,
  suggested_amounts_cents: r.suggested_amounts_cents ?? [],
  tax_deductible: r.tax_deductible,
  is_indexable: r.is_indexable,
  created_at: r.created_at,
});

export async function listFundraisers(): Promise<AdminFundraiser[]> {
  const { data, error } = await table('gw_fundraisers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as unknown as FundraiserRow[]) ?? []).map(toAdmin);
}

export async function createFundraiser(input: {
  slug: string;
  title: string;
  story?: string;
  goal_cents: number;
  ends_at?: string | null;
  default_participant_goal_cents?: number;
}): Promise<AdminFundraiser> {
  const { data, error } = await table('gw_fundraisers')
    .insert({
      slug: input.slug,
      name: input.title,
      description: input.story ?? null,
      goal_cents: input.goal_cents,
      closes_at: input.ends_at ?? null,
      ...(input.default_participant_goal_cents
        ? { default_participant_goal_cents: input.default_participant_goal_cents }
        : {}),
      status: 'draft',
    } as never)
    .select()
    .single();
  if (error) throw error;
  return toAdmin(data as unknown as FundraiserRow);
}

export async function updateFundraiser(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await table('gw_fundraisers').update(patch as never).eq('id', id);
  if (error) throw error;
}

/** Status writes go through here so the UI never has to know the table says
 *  'active' where the rest of the product says 'live'. */
export async function setFundraiserStatus(id: string, status: FundraiserStatus): Promise<void> {
  await updateFundraiser(id, { status: status === 'live' ? 'active' : status });
}

export interface AdminParticipant extends PublicParticipantDetail {
  tenant_id: string;
  fundraiser_id: string;
  user_id: string | null;
  is_public: boolean;
  consent_granted_at: string | null;
  consent_granted_by: string | null;
  manage_token: string;
}

export async function listParticipants(fundraiserId: string): Promise<AdminParticipant[]> {
  const { data, error } = await table('gw_fundraiser_participants')
    .select('*')
    .eq('fundraiser_id', fundraiserId)
    .order('raised_cents', { ascending: false });
  if (error) throw error;
  return (data as unknown as AdminParticipant[]) ?? [];
}

/** Bulk-creates participant pages from the tenant's own roster — the reason
 *  a director would leave a CSV-driven platform. Names publish as "First L."
 *  and every page stays non-public until a guardian consents. */
export async function importRoster(fundraiserId: string, userIds: string[], goalCents?: number) {
  const { data, error } = await rpc('gw_giving_import_roster', {
    p_fundraiser_id: fundraiserId,
    p_user_ids: userIds,
    p_goal_cents: goalCents ?? null,
  });
  if (error) throw error;
  const result = data as { ok?: boolean; created?: number; skipped?: number; error?: string } | null;
  if (result?.error) throw new Error(result.error);
  return { created: result?.created ?? 0, skipped: result?.skipped ?? 0 };
}

export async function setParticipantVisibility(id: string, isPublic: boolean): Promise<void> {
  const { error } = await table('gw_fundraiser_participants')
    .update({ is_public: isPublic } as never)
    .eq('id', id);
  if (error) throw error;
}

/** Admin-recorded consent, for the paper permission slips that come back in
 *  a folder rather than through the emailed link. */
export async function grantParticipantConsent(id: string, grantedBy: string): Promise<void> {
  const { error } = await table('gw_fundraiser_participants')
    .update({ consent_granted_at: new Date().toISOString(), consent_granted_by: grantedBy, is_public: true } as never)
    .eq('id', id);
  if (error) throw error;
}

export interface AdminDonation {
  id: string;
  amount_cents: number;
  fee_cover_cents: number;
  donor_name: string | null;
  donor_email: string | null;
  message: string | null;
  is_anonymous: boolean;
  status: string;
  source: string;
  participant_id: string | null;
  created_at: string;
}

export async function listDonations(fundraiserId: string): Promise<AdminDonation[]> {
  const { data, error } = await table('gw_donations')
    .select('id,amount_cents,fee_cover_cents,donor_name,donor_email,message,is_anonymous,status,source,participant_id,created_at')
    .eq('fundraiser_id', fundraiserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as AdminDonation[]) ?? [];
}

/** Cash and checks. Logged as status='paid' immediately — there is no Stripe
 *  event coming — so the leaderboard reflects what was actually raised. */
export async function recordOfflineDonation(input: {
  fundraiser_id: string;
  participant_id?: string | null;
  amount_cents: number;
  donor_name?: string;
  message?: string;
}): Promise<void> {
  const { error } = await table('gw_donations').insert({
    ...input,
    source: 'offline',
    status: 'paid',
  } as never);
  if (error) throw error;
}

export const fmtMoney = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

export function daysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86400000);
}

export const pctOfGoal = (raised: number, goal: number) =>
  goal <= 0 ? 0 : Math.min(100, Math.round((raised / goal) * 100));
