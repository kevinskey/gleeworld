// Seed helpers for the student-fees E2E spec.
//
// Uses a service-role Supabase client (bypasses RLS) to insert and delete
// gw_student_fees rows. Never call these helpers from a browser context —
// they run in the Node test-runner process only.
//
// Required env vars (set in shell or .env.e2e before running):
//   GW_E2E_SUPABASE_URL       — e.g. https://supabase.gleeworld.org
//   GW_E2E_SERVICE_ROLE_KEY   — service_role JWT (never anon/publishable)
//   GW_E2E_DEMO_USER_ID       — UUID of demo@gleeworld.org on tenant A (main/demo)
//   GW_E2E_TENANT_A_ID        — tenant_id for the demo tenant (UUID)
//   GW_E2E_TENANT_B_ID        — tenant_id for the isolation tenant (UUID)
//   GW_E2E_TENANT_A_SLUG      — subdomain slug for tenant A  (default: demo)
//   GW_E2E_TENANT_B_SLUG      — subdomain slug for tenant B  (default: tenant-b)
//   GW_E2E_TENANT_B_USER_ID   — UUID of demo user on tenant B
//   GW_E2E_TENANT_B_EMAIL     — login email on tenant B
//   GW_E2E_TENANT_B_PASSWORD  — login password on tenant B

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

export const tenantASlug: string =
  process.env.GW_E2E_TENANT_A_SLUG ?? 'demo';

export const tenantBSlug: string =
  process.env.GW_E2E_TENANT_B_SLUG ?? 'tenant-b';

// ---------------------------------------------------------------------------
// Service-role client
// ---------------------------------------------------------------------------

function makeServiceClient(): SupabaseClient {
  const url = process.env.GW_E2E_SUPABASE_URL;
  const key = process.env.GW_E2E_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[feeSeed] GW_E2E_SUPABASE_URL and GW_E2E_SERVICE_ROLE_KEY must be set. ' +
        'These are needed for the service-role client that inserts seed rows.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Lazily created so tests that skip seed don't fail on missing env.
let _client: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  if (!_client) _client = makeServiceClient();
  return _client;
}

// ---------------------------------------------------------------------------
// Seed options
// ---------------------------------------------------------------------------

export interface SeedFeeOptions {
  /** Amount in dollars (integer cents stored as numeric). Default: 25 */
  amount?: number;
  /** Display name for the fee. Default: 'E2E Test Fee' */
  name?: string;
  /** Fee category. Default: 'trip' */
  category?: string;
  /** Tenant slug to derive tenant_id from. Default: tenantASlug */
  tenantSlug?: string;
  /** Override user_id directly (default: GW_E2E_DEMO_USER_ID) */
  userId?: string;
}

// Track every inserted ID so afterEach can clean up without knowing IDs.
const seededIds: string[] = [];

/**
 * Insert a gw_student_fees row via the service-role client and return its id.
 *
 * Usage:
 *   const feeId = await seedFeeForDemoUser({ amount: 25, name: 'E2E Trip Deposit' });
 */
export async function seedFeeForDemoUser(opts: SeedFeeOptions = {}): Promise<string> {
  const db = serviceClient();

  const {
    amount = 25,
    name = 'E2E Test Fee',
    category = 'trip',
    tenantSlug = tenantASlug,
    userId,
  } = opts;

  // Resolve user_id: explicit override > env var.
  const resolvedUserId = userId ?? process.env.GW_E2E_DEMO_USER_ID;
  if (!resolvedUserId) {
    throw new Error('[feeSeed] GW_E2E_DEMO_USER_ID env var is required (or pass userId option).');
  }

  // Resolve tenant_id: look up from gw_tenants by slug.
  const tenantId = await resolveTenantId(db, tenantSlug);

  const now = new Date().toISOString();
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await db
    .from('gw_student_fees')
    .insert({
      user_id: resolvedUserId,
      tenant_id: tenantId,
      amount,
      name,
      category,
      status: 'pending',
      due_date: dueDate,
      semester: 'E2E',
      academic_year: '2026',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`[feeSeed] Insert failed: ${error.message} (code=${error.code})`);
  }
  const id: string = data.id;
  seededIds.push(id);
  return id;
}

/**
 * Delete all rows created by seedFeeForDemoUser in this test run.
 * Call from test.afterEach to keep the demo tenant clean.
 */
export async function cleanupSeededFees(): Promise<void> {
  if (seededIds.length === 0) return;
  const ids = seededIds.splice(0); // drain the array
  const db = serviceClient();
  const { error } = await db.from('gw_student_fees').delete().in('id', ids);
  if (error) {
    // Log but don't throw — cleanup failure shouldn't mask a real test failure.
    console.warn(`[feeSeed] Cleanup warning: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Internal: tenant resolution
// ---------------------------------------------------------------------------

async function resolveTenantId(db: SupabaseClient, slug: string): Promise<string> {
  // Try env vars first to avoid an extra round-trip.
  if (slug === tenantASlug && process.env.GW_E2E_TENANT_A_ID) {
    return process.env.GW_E2E_TENANT_A_ID;
  }
  if (slug === tenantBSlug && process.env.GW_E2E_TENANT_B_ID) {
    return process.env.GW_E2E_TENANT_B_ID;
  }

  // Fall back to querying gw_tenants.
  const { data, error } = await db
    .from('gw_tenants')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    throw new Error(
      `[feeSeed] Could not resolve tenant_id for slug "${slug}": ${error?.message ?? 'no row'}. ` +
        `Set GW_E2E_TENANT_A_ID / GW_E2E_TENANT_B_ID to skip this lookup.`,
    );
  }
  return data.id;
}
