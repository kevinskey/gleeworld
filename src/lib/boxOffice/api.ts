// Box Office data layer. Thin wrappers around supabase-js that scope
// every read/write to the current tenant.
//
// gw_events does NOT have tenant_isolation RLS (the calendar is global
// to authenticated users within a tenant by a different mechanism), so
// every query here explicitly filters by tenant_id pulled from the
// bootstrap config. The 4 ticket-tables DO have tenant_isolation
// RESTRICTIVE policies, so writes are safe even without filtering, but
// we still include the filter for consistency + index hits.

import { supabase } from '@/integrations/supabase/client';

export interface BoxOfficeEvent {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  venue_name: string | null;
  start_date: string;
  end_date: string | null;
  max_attendees: number | null;
  is_public: boolean;
  box_office_status: 'draft' | 'published' | 'closed' | null;
  box_office_slug: string | null;
  box_office_request_max: number | null;
  image_url: string | null;
  calendar_id: string;
  created_at: string;
}

export interface TicketTier {
  id: string;
  tenant_id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  quantity_total: number;
  quantity_sold: number;
  sort_order: number;
  created_at: string;
}

function bootstrapTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant ?? null;
}

/** Look up the caller's tenant_id once via slug. Cached at module level. */
let cachedTenantId: string | null = null;
export async function getCurrentTenantId(): Promise<string | null> {
  if (cachedTenantId) return cachedTenantId;
  const slug = bootstrapTenantSlug();
  if (!slug) return null;
  const { data } = await supabase
    .from('gw_tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  cachedTenantId = (data?.id as string) ?? null;
  return cachedTenantId;
}

/** Look up the tenant's default calendar id so new events have somewhere
 *  to live. We use the oldest calendar — the tenant's "Main" calendar
 *  is always the first one created at provisioning. */
export async function getDefaultCalendarId(tenantId: string): Promise<string | null> {
  const { data } = await supabase
    .from('gw_calendars')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

export async function listBoxOfficeEvents(): Promise<BoxOfficeEvent[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('gw_events')
    .select('id, tenant_id, title, description, venue_name, start_date, end_date, max_attendees, is_public, box_office_status, box_office_slug, box_office_request_max, image_url, calendar_id, created_at')
    .eq('tenant_id', tenantId)
    .not('box_office_status', 'is', null)
    .order('start_date', { ascending: false });
  if (error) {
    console.warn('[BoxOffice] list events failed', error.message);
    return [];
  }
  return (data ?? []) as BoxOfficeEvent[];
}

export async function getBoxOfficeEvent(eventId: string): Promise<BoxOfficeEvent | null> {
  const { data, error } = await supabase
    .from('gw_events')
    .select('id, tenant_id, title, description, venue_name, start_date, end_date, max_attendees, is_public, box_office_status, box_office_slug, box_office_request_max, image_url, calendar_id, created_at')
    .eq('id', eventId)
    .maybeSingle();
  if (error) {
    console.warn('[BoxOffice] get event failed', error.message);
    return null;
  }
  return data as BoxOfficeEvent | null;
}

export async function listTicketTiers(eventId: string): Promise<TicketTier[]> {
  const { data, error } = await supabase
    .from('gw_ticket_tiers')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('[BoxOffice] list tiers failed', error.message);
    return [];
  }
  return (data ?? []) as TicketTier[];
}

/** Slugify a title for the public buy URL. lowercase + hyphenated. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export interface CreateEventInput {
  title: string;
  venue_name?: string;
  description?: string;
  start_date: string;
  capacity: number;
  slug?: string;
}

export async function createBoxOfficeEvent(input: CreateEventInput): Promise<BoxOfficeEvent> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant context');
  const calendarId = await getDefaultCalendarId(tenantId);
  if (!calendarId) throw new Error('No calendar configured for this tenant');

  const slug = (input.slug || slugify(input.title)) || 'event';

  const { data, error } = await supabase
    .from('gw_events')
    .insert({
      tenant_id: tenantId,
      calendar_id: calendarId,
      title: input.title,
      description: input.description ?? null,
      venue_name: input.venue_name ?? null,
      start_date: input.start_date,
      max_attendees: input.capacity,
      is_public: true,
      event_type: 'performance',
      status: 'scheduled',
      box_office_status: 'draft',
      box_office_slug: slug,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BoxOfficeEvent;
}

export async function updateBoxOfficeEvent(eventId: string, patch: Partial<BoxOfficeEvent>): Promise<void> {
  // Whitelist the columns Box Office is allowed to edit.
  const allowed: Partial<BoxOfficeEvent> = {};
  if (patch.title !== undefined)              allowed.title = patch.title;
  if (patch.description !== undefined)        allowed.description = patch.description;
  if (patch.venue_name !== undefined)         allowed.venue_name = patch.venue_name;
  if (patch.start_date !== undefined)         allowed.start_date = patch.start_date;
  if (patch.max_attendees !== undefined)      allowed.max_attendees = patch.max_attendees;
  if (patch.box_office_status !== undefined)       allowed.box_office_status = patch.box_office_status;
  if (patch.box_office_slug !== undefined)         allowed.box_office_slug = patch.box_office_slug;
  if (patch.box_office_request_max !== undefined)  allowed.box_office_request_max = patch.box_office_request_max;
  if (patch.image_url !== undefined)               allowed.image_url = patch.image_url;
  const { error } = await supabase
    .from('gw_events')
    .update(allowed)
    .eq('id', eventId);
  if (error) throw new Error(error.message);
}

export async function deleteBoxOfficeEvent(eventId: string): Promise<void> {
  // Delete only if box_office_status is set — protects calendar-only rows.
  // Also blocks deletion if any orders already exist (FK ON DELETE RESTRICT
  // on gw_ticket_orders.event_id will throw).
  const { error } = await supabase
    .from('gw_events')
    .delete()
    .eq('id', eventId)
    .not('box_office_status', 'is', null);
  if (error) throw new Error(error.message);
}

export interface CreateTierInput {
  event_id: string;
  name: string;
  description?: string;
  price_cents: number;
  quantity_total: number;
}

export async function createTier(input: CreateTierInput): Promise<TicketTier> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant context');
  const { data, error } = await supabase
    .from('gw_ticket_tiers')
    .insert({
      tenant_id: tenantId,
      event_id: input.event_id,
      name: input.name,
      description: input.description ?? null,
      price_cents: input.price_cents,
      quantity_total: input.quantity_total,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TicketTier;
}

export async function updateTier(tierId: string, patch: Partial<TicketTier>): Promise<void> {
  const allowed: Partial<TicketTier> = {};
  if (patch.name !== undefined)            allowed.name = patch.name;
  if (patch.description !== undefined)     allowed.description = patch.description;
  if (patch.price_cents !== undefined)     allowed.price_cents = patch.price_cents;
  if (patch.quantity_total !== undefined)  allowed.quantity_total = patch.quantity_total;
  if (patch.sort_order !== undefined)      allowed.sort_order = patch.sort_order;
  const { error } = await supabase
    .from('gw_ticket_tiers')
    .update(allowed)
    .eq('id', tierId);
  if (error) throw new Error(error.message);
}

export async function deleteTier(tierId: string): Promise<void> {
  const { error } = await supabase
    .from('gw_ticket_tiers')
    .delete()
    .eq('id', tierId);
  if (error) throw new Error(error.message);
}
