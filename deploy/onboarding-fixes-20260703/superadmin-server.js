// GleeWorld Super-Admin: tenant provisioning API.
// All endpoints require a JWT issued by self-hosted Supabase belonging to a
// user with gw_profiles.is_super_admin = true.
//
// Auth: Authorization: Bearer <user-JWT> on every call.
// Provisioning runs as service_role and bypasses RLS.

import 'dotenv/config';
import express from 'express';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Stripe from 'stripe';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import WebSocket from 'ws';
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket;

const PORT = Number(process.env.PORT || 3035);
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.gleeworld.org';
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'gleeworld.org';
const RESEND_KEY = process.env.RESEND_API_KEY;
const SENDER = process.env.SENDER_EMAIL || `welcome@${ROOT_DOMAIN}`;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const VHOST_SCRIPT = process.env.VHOST_SCRIPT || '/opt/gleeworld-superadmin/scripts/provision-vhost.sh';
const VHOST_REMOVE_SCRIPT = process.env.VHOST_REMOVE_SCRIPT || '/opt/gleeworld-superadmin/scripts/remove-vhost.sh';
// Platform-level rows that aren't customers. Hidden from listings and protected from delete.
const PLATFORM_SLUGS = new Set(['main']);

if (!SERVICE_KEY || !ANON_KEY) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY required.');
  process.exit(1);
}

const sa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;
const SPACES_BUCKET = process.env.SPACES_BUCKET || 'glee-world';
const SPACES_REGION = process.env.SPACES_REGION || 'sfo3';
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || `https://${SPACES_REGION}.digitaloceanspaces.com`;
const SPACES_KEY = process.env.SPACES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const SPACES_SECRET = process.env.SPACES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const s3 = (SPACES_KEY && SPACES_SECRET)
  ? new S3Client({ region: SPACES_REGION, endpoint: SPACES_ENDPOINT, credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET } })
  : null;

const app = express();
app.use(express.json({ limit: '1mb' }));

// ───── Auth middleware ─────
// Local services (e.g. the Stripe provision webhook on :3030) authenticate
// with a shared secret instead of a user JWT. This server binds to 127.0.0.1
// only, so the token never crosses the network.
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || null;

// Cached id of the platform tenant (slug='main') — populated on first call,
// invalidated never (the main tenant doesn't change). Caller must be a
// super-admin of this tenant specifically — a super-admin of `demo` or any
// other customer tenant gets 403. This prevents customer admins from using
// the platform-provisioning API.
let _platformTenantId = null;
async function getPlatformTenantId() {
  if (_platformTenantId) return _platformTenantId;
  const { data, error } = await sa
    .from('gw_tenants')
    .select('id')
    .eq('slug', 'main')
    .maybeSingle();
  if (error || !data) return null;
  _platformTenantId = data.id;
  return _platformTenantId;
}

async function requireSuperAdmin(req, res, next) {
  if (INTERNAL_TOKEN && req.header('x-internal-token') === INTERNAL_TOKEN) {
    req.user = { id: 'internal', email: 'internal@localhost' };
    return next();
  }
  const auth = req.header('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'auth_required' });
  try {
    const { data: u, error } = await sa.auth.getUser(token);
    if (error || !u?.user) return res.status(401).json({ error: 'invalid_token' });
    const { data: p, error: pe } = await sa
      .from('gw_profiles')
      .select('user_id, is_super_admin, role, tenant_id')
      .eq('user_id', u.user.id)
      .maybeSingle();
    if (pe) return res.status(500).json({ error: 'profile_lookup_failed' });
    const isSuperAdmin = !!(p && (p.is_super_admin === true || p.role === 'super-admin' || p.role === 'super_admin'));
    if (!isSuperAdmin) return res.status(403).json({ error: 'super_admin_only' });
    // Platform-scope check: super-admin status alone isn't enough — the user
    // must be on the main tenant. Otherwise a customer's tenant admin could
    // call provisioning endpoints (verified 2026-06-13 that demo-admin could
    // do this before the check was added).
    const mainId = await getPlatformTenantId();
    if (!mainId) return res.status(500).json({ error: 'platform_tenant_missing' });
    if (p.tenant_id !== mainId) return res.status(403).json({ error: 'platform_admin_only' });
    req.user = u.user;
    next();
  } catch (e) {
    console.error('auth check failed:', e);
    res.status(500).json({ error: 'auth_check_failed' });
  }
}

// ───── Endpoints ─────

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Validate auth + return who the caller is.
app.get('/me', requireSuperAdmin, async (req, res) => {
  res.json({ user_id: req.user.id, email: req.user.email });
});

// Per-module probe definitions. Each probe returns a status (green/yellow/red)
// based on table presence, row counts (where helpful), and external integration
// configuration. Probes use the service-role client so they bypass RLS.
const MODULE_PROBES = {
  ai_grading:           { tables: ['mus240_submission_grades','mus240_rubric_criteria'], requires_env: ['OPENAI_API_KEY','ANTHROPIC_API_KEY'], optional_env: true },
  ai_hub:               { tables: ['gw_modules'], requires_env: ['OPENAI_API_KEY','ANTHROPIC_API_KEY'], optional_env: true },
  alumni:               { tables: ['alumnae_content','alumnae_stories'] },
  alumni_portal:        { tables: ['alumnae_global_settings','alumnae_newsletters'] },
  analytics:            { tables: ['user_page_views','user_sessions','user_engagement_daily'] },
  announcements:        { tables: ['bulletin_posts','course_announcements'] },
  appointments:         { tables: ['gw_appointment_availability','gw_appointment_services','gw_booking_requests'] },
  attendance:           { tables: ['gw_attendance_records','gw_attendance_qr_codes','gw_attendance_policies'] },
  auditions:            { tables: ['gw_auditions','audition_applications','audition_sessions'] },
  branding:             { tables: ['gw_branding_settings'] },
  calendar:             { tables: ['gw_calendars','gw_events'] },
  communications:       { tables: ['gw_communication_templates','gw_user_message_history'] },
  contracts:            { tables: ['contracts','contracts_v2','contract_templates','contract_signatures_v2'] },
  courses:              { tables: ['glee_academy_courses','gw_course_submissions','gw_course_requirements'] },
  feeds:                { tables: ['gw_feed_saves'] },
  finance:              { tables: ['finance_records','gw_dues_records','user_payments','budgets'] },
  merch:                { tables: ['products','product_categories','product_images'] },
  messenger:            { tables: ['dm_conversations','dm_messages','messenger_groups','messenger_group_members'] },
  music_library:        { tables: ['music_albums','music_tracks','audio_archive'] },
  public_site:          { tables: ['gw_hero_slides','gw_universal_sliders','dashboard_settings'] },
  quick_capture:        { tables: ['quick_capture_media','glee_cam_categories'] },
  radio:                { tables: ['gw_radio_playlist_queue','soundcloud_tokens'], requires_env: ['SOUNDCLOUD_CLIENT_ID'], optional_env: true },
  sheet_music_annotation:{ tables: ['gw_marked_scores','gw_sheet_music_notes','gw_sheet_music_permissions'] },
  sight_reading:        { tables: ['gw_modules'] },
  sms:                  { tables: ['gw_communication_templates'], requires_env: ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER'] },
  tickets:              { tables: ['concert_ticket_requests'] },
  tour:                 { tables: ['tour_milestones','tour_budget_items','tour_budget_revenues','tour_contract_signatures'] },
  users:                { tables: ['gw_profiles','gw_tenant_members','user_roles','user_roles_multi'] },
  video:                { tables: ['gw_video_sessions','gw_video_session_participants','gw_video_session_chat'] },
  wardrobe:             { tables: ['wardrobe_items','gw_wardrobe_inventory','gw_member_wardrobe_profiles'] },
};

// Run every module's probe in parallel. Reports module status + reasons.
// If tenantId is supplied, scopes every table query to that tenant + reports
// the gw_tenant_subscriptions status for each module.
async function runHealthCheck(tenantId) {
  const { data: modules } = await sa.from('gw_billing_modules').select('id, name, tier').order('id');
  const moduleList = modules || [];

  const env = process.env;
  const stripeOk = !!env.STRIPE_SECRET_KEY;
  const resendOk = !!env.RESEND_API_KEY;
  const spacesOk = !!(env.SPACES_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID);

  // Per-tenant subscription rollup: module_id → status
  let subStatus = new Map();
  let tenantInfo = null;
  // Platform-wide adoption: module_id → { status → count, customers: [{slug,name,status}] }
  let adoption = new Map();
  let customerCount = 0;

  if (tenantId) {
    const [{ data: tenant }, { data: subs }] = await Promise.all([
      sa.from('gw_tenants').select('id, slug, name, status').eq('id', tenantId).maybeSingle(),
      sa.from('gw_tenant_subscriptions').select('module_id, status').eq('tenant_id', tenantId),
    ]);
    tenantInfo = tenant;
    for (const s of subs || []) subStatus.set(s.module_id, s.status);
  } else {
    // Platform scope — roll up subscriptions across all customer tenants.
    const [{ data: customers }, { data: allSubs }] = await Promise.all([
      sa.from('gw_tenants').select('id, slug, name').not('slug', 'in', `(${[...PLATFORM_SLUGS].map((s) => `"${s}"`).join(',')})`),
      sa.from('gw_tenant_subscriptions').select('tenant_id, module_id, status'),
    ]);
    const tenantById = new Map((customers || []).map((t) => [t.id, t]));
    customerCount = (customers || []).length;
    for (const s of allSubs || []) {
      const t = tenantById.get(s.tenant_id);
      if (!t) continue; // skip platform tenants
      let row = adoption.get(s.module_id);
      if (!row) { row = { active: 0, trial: 0, past_due: 0, cancelled: 0, customers: [] }; adoption.set(s.module_id, row); }
      const key = s.status === 'canceled' ? 'cancelled' : s.status;
      if (row[key] !== undefined) row[key]++;
      row.customers.push({ slug: t.slug, name: t.name, status: s.status });
    }
  }

  const results = await Promise.all(moduleList.map(async (m) => {
    const probe = MODULE_PROBES[m.id] || { tables: [] };
    const reasons = [];
    let status = 'green';

    // Table reachability — filter by tenant_id when scoping to a customer.
    let tablesOk = 0, tablesFailed = 0, totalRows = 0;
    for (const t of probe.tables || []) {
      try {
        let q = sa.from(t).select('*', { head: true, count: 'exact' });
        if (tenantId) q = q.eq('tenant_id', tenantId);
        const { count, error } = await q;
        if (error) {
          // tenant_id column might not exist on some shared tables (e.g. gw_modules,
          // user_roles). These are HEAD requests, so PostgREST's error body is
          // dropped and error.code/message are empty — the only reliable signal
          // is to retry unfiltered: if that works, the table exists and just
          // isn't tenant-scoped.
          if (tenantId) {
            const { count: c2, error: e2 } = await sa.from(t).select('*', { head: true, count: 'exact' });
            if (e2) { tablesFailed++; reasons.push(`table ${t}: ${e2.code || e2.message}`); }
            else { tablesOk++; totalRows += c2 || 0; }
          } else {
            tablesFailed++; reasons.push(`table ${t}: ${error.code || error.message}`);
          }
        } else { tablesOk++; totalRows += count || 0; }
      } catch (e) { tablesFailed++; reasons.push(`table ${t}: ${e.message}`); }
    }
    if (tablesFailed > 0) status = 'red';

    // Per-tenant subscription state (if scoped).
    let tenantSub = null;
    if (tenantId) {
      tenantSub = subStatus.get(m.id) || 'inactive';
      if (tenantSub === 'inactive' || tenantSub === 'cancelled' || tenantSub === 'canceled') {
        // Not subscribed — yellow with reason, unless it was already red.
        if (status === 'green') status = 'yellow';
        reasons.push(`not subscribed (${tenantSub})`);
      } else if (tenantSub === 'past_due') {
        if (status !== 'red') status = 'yellow';
        reasons.push('subscription past_due');
      }
    }

    // Required env vars
    if (probe.requires_env && probe.requires_env.length) {
      const missing = probe.requires_env.filter((k) => !env[k]);
      if (missing.length === probe.requires_env.length) {
        // None set
        if (probe.optional_env) {
          reasons.push(`optional: needs ${probe.requires_env.join(' or ')}`);
          if (status === 'green') status = 'yellow';
        } else {
          reasons.push(`missing required env: ${probe.requires_env.join(',')}`);
          status = 'red';
        }
      } else if (missing.length > 0 && !probe.optional_env) {
        reasons.push(`partial env config: missing ${missing.join(',')}`);
        if (status === 'green') status = 'yellow';
      }
    }

    const adoptRow = adoption.get(m.id);
    return {
      id: m.id,
      name: m.name,
      tier: m.tier,
      status,
      tables_ok: tablesOk,
      tables_failed: tablesFailed,
      total_rows: totalRows,
      tenant_subscription: tenantSub,
      adoption: adoptRow ? {
        active: adoptRow.active,
        trial: adoptRow.trial,
        past_due: adoptRow.past_due,
        cancelled: adoptRow.cancelled,
        total_subscribed: adoptRow.active + adoptRow.trial + adoptRow.past_due,
        customers: adoptRow.customers,
      } : null,
      reasons: reasons.slice(0, 4),
    };
  }));

  return {
    generated_at: new Date().toISOString(),
    scope: tenantId ? 'tenant' : 'platform',
    tenant: tenantInfo,
    customer_count: customerCount,
    integrations: {
      stripe:  { ok: stripeOk,  note: stripeOk ? 'key configured' : 'STRIPE_SECRET_KEY missing' },
      resend:  { ok: resendOk,  note: resendOk ? 'key configured' : 'RESEND_API_KEY missing' },
      spaces:  { ok: spacesOk,  note: spacesOk ? 'keys configured' : 'SPACES/AWS keys missing' },
      stripe_webhook: { ok: !!env.STRIPE_WEBHOOK_SECRET, note: env.STRIPE_WEBHOOK_SECRET ? 'signed' : 'unsigned (insecure)' },
    },
    modules: results,
    summary: {
      total: results.length,
      green: results.filter((r) => r.status === 'green').length,
      yellow: results.filter((r) => r.status === 'yellow').length,
      red: results.filter((r) => r.status === 'red').length,
    },
  };
}

// Module health endpoint — runs every probe in parallel.
// ?tenant_id=<uuid> scopes the report to that customer.
app.get('/health', requireSuperAdmin, async (req, res) => {
  try {
    const tenantId = req.query.tenant_id?.toString() || null;
    const report = await runHealthCheck(tenantId);
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: 'health_failed', detail: String(e?.message ?? e) });
  }
});

// Business dashboard KPIs (everything excludes PLATFORM_SLUGS).
app.get('/stats', requireSuperAdmin, async (_req, res) => {
  try {
    const { data: tenants } = await sa
      .from('gw_tenants')
      .select('id, slug, plan, status, stripe_customer_id, created_at')
      .order('created_at', { ascending: false });
    const customers = (tenants || []).filter((t) => !PLATFORM_SLUGS.has(t.slug));

    // Subscription rollup — module subscriptions × billing prices.
    const tenantIds = customers.map((t) => t.id);
    const { data: subs } = tenantIds.length
      ? await sa
          .from('gw_tenant_subscriptions')
          .select('tenant_id, module_id, status, current_period_end, stripe_subscription_id')
          .in('tenant_id', tenantIds)
      : { data: [] };
    const { data: modules } = await sa
      .from('gw_billing_modules')
      .select('id, name, tier, stripe_price_id, metadata');
    const priceMap = new Map();
    for (const m of modules || []) {
      const cents = m.metadata?.price_cents || m.metadata?.monthly_price_cents || 0;
      if (cents) priceMap.set(m.id, cents);
    }

    let mrrCents = 0;
    let activeSubsCount = 0;
    let trialingCount = 0;
    for (const s of subs || []) {
      if (s.status === 'active') {
        activeSubsCount++;
        mrrCents += priceMap.get(s.module_id) || 0;
      } else if (s.status === 'trial') {
        trialingCount++;
      }
    }

    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const newThisMonth = customers.filter((t) => new Date(t.created_at) > monthAgo).length;

    res.json({
      customers: {
        total: customers.length,
        active: customers.filter((t) => t.status === 'active').length,
        trial: customers.filter((t) => t.status === 'trial' || t.status === 'trialing').length,
        suspended: customers.filter((t) => t.status === 'suspended').length,
        new_this_month: newThisMonth,
      },
      revenue: {
        mrr_cents: mrrCents,
        arr_cents: mrrCents * 12,
        active_subs: activeSubsCount,
        trialing_subs: trialingCount,
      },
      modules: {
        total: (modules || []).length,
        with_price: priceMap.size,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'stats_failed', detail: String(e?.message ?? e) });
  }
});

// Per-customer detail: everything you need on one screen.
app.get('/tenants/:id', requireSuperAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { data: tenant, error: te } = await sa
      .from('gw_tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (te) return res.status(500).json({ error: te.message });
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });

    const [{ data: branding }, { data: members }, { data: subs }, { data: modules }] = await Promise.all([
      sa.from('gw_branding_settings').select('org_name, short_name, tagline, primary_color, logo_url, setup_completed').eq('tenant_id', id).maybeSingle(),
      sa.from('gw_tenant_members').select('user_id, role, created_at').eq('tenant_id', id),
      sa.from('gw_tenant_subscriptions').select('module_id, status, current_period_end, trial_ends_at, stripe_subscription_id, enabled_at').eq('tenant_id', id),
      sa.from('gw_billing_modules').select('id, name, tier, metadata'),
    ]);

    // Hydrate members with email.
    const memberWithEmail = [];
    for (const m of (members || [])) {
      try {
        const { data: u } = await sa.auth.admin.getUserById(m.user_id);
        memberWithEmail.push({ ...m, email: u?.user?.email || null });
      } catch { memberWithEmail.push({ ...m, email: null }); }
    }

    const priceMap = new Map((modules || []).map((m) => [m.id, { name: m.name, tier: m.tier, price_cents: m.metadata?.price_cents || 0 }]));
    let mrrCents = 0;
    const subsRollup = (subs || []).map((s) => {
      const m = priceMap.get(s.module_id) || { name: s.module_id, tier: '?', price_cents: 0 };
      if (s.status === 'active') mrrCents += m.price_cents;
      return { ...s, module_name: m.name, tier: m.tier, price_cents: m.price_cents };
    });

    let stripeInfo = null;
    if (stripe && tenant.stripe_customer_id) {
      try {
        const c = await stripe.customers.retrieve(tenant.stripe_customer_id);
        stripeInfo = c.deleted ? { deleted: true } : { id: c.id, email: c.email, balance: c.balance, currency: c.currency };
      } catch (e) { stripeInfo = { error: e.message }; }
    }

    res.json({
      tenant,
      branding: branding || null,
      members: memberWithEmail,
      subscriptions: subsRollup,
      mrr_cents: mrrCents,
      stripe: stripeInfo,
      urls: {
        public: tenant.custom_domain ? `https://${tenant.custom_domain}` : `https://${tenant.subdomain}.${ROOT_DOMAIN}`,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'detail_failed', detail: String(e?.message ?? e) });
  }
});

// List customer tenants (for the dashboard). Hides PLATFORM_SLUGS by default.
app.get('/tenants', requireSuperAdmin, async (req, res) => {
  const includePlatform = req.query.include_platform === '1';
  const { data, error } = await sa
    .from('gw_tenants')
    .select('id, slug, name, subdomain, custom_domain, plan, status, created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const rows = includePlatform ? data : (data || []).filter((t) => !PLATFORM_SLUGS.has(t.slug));
  res.json({ tenants: rows || [] });
});

// Delete a tenant end-to-end.
// Removes: Stripe customer, subscriptions, members, branding, profile, auth user
// (if it has no other tenants), tenants row, nginx vhost(s), per-tenant bootstrap dir.
// Refuses to delete tenants whose slug is in PLATFORM_SLUGS.
app.delete('/tenants/:id', requireSuperAdmin, async (req, res) => {
  const tenantId = req.params.id;
  const log = [];
  try {
    const { data: tenant, error: te } = await sa
      .from('gw_tenants')
      .select('id, slug, name, subdomain, custom_domain, stripe_customer_id')
      .eq('id', tenantId)
      .maybeSingle();
    if (te) return res.status(500).json({ error: 'lookup_failed', detail: te.message });
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });
    if (PLATFORM_SLUGS.has(tenant.slug)) return res.status(400).json({ error: 'cannot_delete_platform_tenant', slug: tenant.slug });
    log.push(`tenant: ${tenant.slug} (${tenantId})`);

    // 1. Stripe customer.
    if (stripe && tenant.stripe_customer_id) {
      try {
        await stripe.customers.del(tenant.stripe_customer_id);
        log.push(`stripe customer deleted: ${tenant.stripe_customer_id}`);
      } catch (e) { log.push(`stripe del failed: ${e.message}`); }
    }

    // 2. Capture every user_id that touches this tenant via membership OR profile.
    // Sole-tenant users get their auth.users deleted at the end.
    const [{ data: members }, { data: profiles }] = await Promise.all([
      sa.from('gw_tenant_members').select('user_id').eq('tenant_id', tenantId),
      sa.from('gw_profiles').select('user_id').eq('tenant_id', tenantId),
    ]);
    const allUserIds = [...new Set([
      ...(members || []).map((m) => m.user_id),
      ...(profiles || []).map((p) => p.user_id),
    ].filter(Boolean))];

    const soleTenantUsers = [];
    for (const uid of allUserIds) {
      const [{ count: mc }, { count: pc }] = await Promise.all([
        sa.from('gw_tenant_members').select('user_id', { head: true, count: 'exact' }).eq('user_id', uid).neq('tenant_id', tenantId),
        sa.from('gw_profiles').select('user_id', { head: true, count: 'exact' }).eq('user_id', uid).neq('tenant_id', tenantId),
      ]);
      if ((mc || 0) === 0 && (pc || 0) === 0) soleTenantUsers.push(uid);
    }
    log.push(`users tied to tenant: ${allUserIds.length}, sole-tenant: ${soleTenantUsers.length}`);

    // 2b. Storage objects — capture before DB rows are gone so we can wipe S3.
    let storageKeys = [];
    try {
      const { data: keys } = await sa.rpc('list_tenant_storage_keys', { p_tenant: tenantId });
      storageKeys = keys || [];
      log.push(`storage objects to delete: ${storageKeys.length}`);
    } catch (e) { log.push(`storage list warning: ${e.message}`); }

    // 3. Wipe rows in every public table that has a tenant_id column.
    // purge_tenant_data uses session_replication_role='replica' inside the
    // function to bypass FK checks during the bulk delete.
    try {
      const { data: purgeLog, error: purgeErr } = await sa.rpc('purge_tenant_data', { p_tenant: tenantId });
      if (purgeErr) throw purgeErr;
      let total = 0;
      for (const row of purgeLog || []) total += Number(row.rows_deleted) || 0;
      log.push(`purge: ${(purgeLog || []).length} tables, ${total} rows`);
    } catch (e) {
      return res.status(500).json({ error: 'tenant_purge_failed', detail: e.message, log });
    }

    // 4. Delete sole-tenant auth users.
    let deletedUsers = 0;
    for (const uid of soleTenantUsers) {
      try {
        const { error } = await sa.auth.admin.deleteUser(uid);
        if (error) log.push(`auth user ${uid} skipped: ${error.message}`);
        else deletedUsers++;
      } catch (e) { log.push(`auth user ${uid} skipped: ${e.message}`); }
    }
    log.push(`auth users deleted: ${deletedUsers}`);

    // 4b. Wipe storage objects from DO Spaces + drop their metadata rows.
    if (s3 && storageKeys.length) {
      const batches = [];
      for (let i = 0; i < storageKeys.length; i += 1000) batches.push(storageKeys.slice(i, i + 1000));
      let wipedFromS3 = 0;
      for (const batch of batches) {
        try {
          await s3.send(new DeleteObjectsCommand({
            Bucket: SPACES_BUCKET,
            Delete: { Objects: batch.map((o) => ({ Key: `${o.bucket_id}/${o.name}` })) },
          }));
          wipedFromS3 += batch.length;
        } catch (e) { log.push(`s3 batch delete failed: ${e.message}`); }
      }
      log.push(`s3 objects deleted: ${wipedFromS3}`);
      try {
        const { data: dropped } = await sa.rpc('delete_tenant_storage_metadata', { p_tenant: tenantId });
        log.push(`storage.objects rows dropped: ${dropped ?? 'ok'}`);
      } catch (e) { log.push(`storage metadata drop warning: ${e.message}`); }
    } else if (storageKeys.length && !s3) {
      log.push(`s3 client not configured — ${storageKeys.length} storage keys left behind`);
    }

    // 5. Tenants row.
    {
      const { error } = await sa.from('gw_tenants').delete().eq('id', tenantId);
      if (error) {
        log.push(`gw_tenants delete failed: ${error.message}`);
        return res.status(500).json({ error: 'tenant_delete_blocked', detail: error.message, log });
      }
      log.push('gw_tenants: 1');
    }

    // 6. nginx vhost + bootstrap dir for subdomain and (optional) custom domain.
    const subHost = `${tenant.subdomain || tenant.slug}.${ROOT_DOMAIN}`;
    log.push(...await removeVhost(tenant.slug, subHost));
    if (tenant.custom_domain && tenant.custom_domain !== subHost) {
      log.push(...await removeVhost(tenant.slug, tenant.custom_domain));
    }

    res.json({ ok: true, deleted: { id: tenantId, slug: tenant.slug }, log });
  } catch (e) {
    console.error('delete failed:', e);
    res.status(500).json({ error: 'delete_failed', detail: String(e?.message ?? e), log });
  }
});

// Provision a new tenant end-to-end.
app.post('/tenants', requireSuperAdmin, async (req, res) => {
  const b = req.body || {};
  const slug = clean(b.slug, 60);
  const name = (b.name || '').trim();
  const subdomain = clean(b.subdomain || slug, 60);
  const customDomain = (b.custom_domain || '').trim().toLowerCase() || null;
  const adminEmail = (b.admin_email || '').trim().toLowerCase();
  const adminName = (b.admin_name || '').trim() || adminEmail.split('@')[0];
  const plan = (b.plan || 'starter').trim();
  // 'self' → customer designs their own site: setup_completed stays false so
  // their first sign-in routes into the guided Site Setup. 'gleeworld'
  // (default, used by the Control Center) → we design it, gate stays closed.
  const deploymentPath = b.deployment_path === 'self' ? 'self' : 'gleeworld';
  // Checkout already created a paying Stripe customer? Link that one instead
  // of minting a second, empty customer.
  const existingStripeCustomer = (b.stripe_customer_id || '').trim() || null;

  if (!slug) return res.status(400).json({ error: 'slug_required' });
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return res.status(400).json({ error: 'slug_invalid' });
  if (!name) return res.status(400).json({ error: 'name_required' });
  if (!adminEmail || !/.+@.+\..+/.test(adminEmail)) return res.status(400).json({ error: 'admin_email_invalid' });

  try {
    // 1. Tenant row.
    const { data: tenantRow, error: te } = await sa
      .from('gw_tenants')
      .insert({ slug, name, subdomain, custom_domain: customDomain, plan, status: 'active' })
      .select()
      .single();
    if (te) {
      if (te.code === '23505') return res.status(409).json({ error: 'slug_or_subdomain_taken', detail: te.message });
      return res.status(500).json({ error: 'tenant_insert_failed', detail: te.message });
    }
    const tenantId = tenantRow.id;
    const log = [`tenant created: ${tenantId}`];

    // 2. Branding settings. setup_completed is the deployment-path switch:
    // 'self' leaves it false so the dashboard routes the new admin into the
    // guided Site Setup on first sign-in; 'gleeworld' pre-completes it so a
    // concierge-built site never shows the customer scaffolding.
    const setupCompleted = deploymentPath !== 'self';
    const { error: be } = await sa.from('gw_branding_settings').insert({
      id: nextBrandingId(),
      tenant_id: tenantId,
      org_name: name,
      short_name: shorten(name),
      tagline: null,
      primary_color: '#003666',
      setup_completed: setupCompleted,
    });
    if (be) log.push(`branding insert warning: ${be.message}`);
    else log.push(`branding row created (setup_completed=${setupCompleted}, path=${deploymentPath})`);

    // 3. Admin user — create with a temporary password instead of using
    // GoTrue's inviteUserByEmail magic link, which builds the verify URL from
    // SITE_URL (gleeworld.org) and gleeworld.org doesn't proxy /auth/v1/*.
    // Instead: provision with a random temp password and email it ourselves
    // via Resend (step 9) with the subdomain-correct sign-in URL. The admin
    // changes the password from /reset-password after first sign-in.
    const tempPassword = generateTempPassword();
    let adminUserId = null;
    let isNewUser = false;
    const existing = await findUserByEmail(adminEmail);
    if (existing) {
      log.push('admin user exists — linking (password unchanged)');
      adminUserId = existing.id;
    } else {
      const { data: created, error: ce } = await sa.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true,
        // must_change_password gates the SPA: first sign-in is routed to
        // /force-password-change before anything else.
        user_metadata: { full_name: adminName, tenant_id: tenantId, tenant_slug: slug, must_change_password: true },
      });
      if (ce) {
        return res.status(500).json({ error: 'invite_failed', detail: ce.message, tenant_id: tenantId, log });
      }
      adminUserId = created?.user?.id;
      isNewUser = true;
      log.push(`admin created: ${adminUserId}`);
    }
    if (!adminUserId) {
      return res.status(500).json({ error: 'admin_lookup_failed', tenant_id: tenantId, log });
    }

    // 4. Profile row (gw_profiles) for admin.
    const { error: pe } = await sa.from('gw_profiles').upsert({
      user_id: adminUserId,
      email: adminEmail,
      full_name: adminName,
      tenant_id: tenantId,
      role: 'super-admin',
      is_admin: true,
      is_super_admin: false,  // tenant-level super, not platform super
    }, { onConflict: 'user_id' });
    if (pe) log.push(`profile upsert warning: ${pe.message}`);
    else log.push('admin profile linked');

    // 5. Tenant membership (drives JWT tenant_id claim).
    const { error: me } = await sa.from('gw_tenant_members').upsert({
      user_id: adminUserId,
      tenant_id: tenantId,
      role: 'super-admin',
    }, { onConflict: 'user_id,tenant_id' });
    if (me) log.push(`membership warning: ${me.message}`);
    else log.push('admin membership linked');

    // 6. Stripe customer — billing handle for future module subscriptions.
    // When checkout already created the paying customer (self-serve purchase),
    // link that one — a second, empty customer would orphan the real
    // subscription from the tenant.
    if (stripe && existingStripeCustomer) {
      try {
        await stripe.customers.update(existingStripeCustomer, {
          metadata: { gw_tenant_id: tenantId, gw_slug: slug },
        });
        await sa.from('gw_tenants').update({ stripe_customer_id: existingStripeCustomer }).eq('id', tenantId);
        log.push(`stripe customer linked (from checkout): ${existingStripeCustomer}`);
      } catch (e) {
        log.push(`stripe customer link failed: ${e.message}`);
      }
    } else if (stripe) {
      try {
        const customer = await stripe.customers.create({
          email: adminEmail,
          name,
          metadata: {
            gw_tenant_id: tenantId,
            gw_slug: slug,
          },
        });
        await sa.from('gw_tenants').update({ stripe_customer_id: customer.id }).eq('id', tenantId);
        log.push(`stripe customer created: ${customer.id}`);
      } catch (e) {
        log.push(`stripe customer failed: ${e.message}`);
      }
    } else {
      log.push('stripe disabled (no STRIPE_SECRET_KEY)');
    }

    // 7. Nginx vhost + per-tenant bootstrap.js for subdomain (and optional custom domain).
    const subHost = `${subdomain}.${ROOT_DOMAIN}`;
    log.push(...await provisionVhost(slug, subHost, name));
    if (customDomain && customDomain !== subHost) {
      log.push(...await provisionVhost(slug, customDomain, name));
    }

    // 8. Seed starter modules as active subscriptions.
    const { data: starters } = await sa
      .from('gw_billing_modules')
      .select('id')
      .eq('tier', 'starter');
    if (starters && starters.length) {
      const rows = starters.map((m) => ({
        tenant_id: tenantId,
        module_id: m.id,
        status: 'active',
      }));
      const { error: se } = await sa
        .from('gw_tenant_subscriptions')
        .upsert(rows, { onConflict: 'tenant_id,module_id' });
      if (se) log.push(`module seed warning: ${se.message}`);
      else log.push(`${rows.length} starter modules activated`);
    }

    // 9. Verification gate — prove the site and its database wiring work
    // BEFORE the customer is told anything. A broken site that was never
    // announced is a five-minute fix; one that was announced is a refund
    // conversation.
    const verifyHost = customDomain || `${subdomain}.${ROOT_DOMAIN}`;
    const verification = await verifyTenant({
      tenantId,
      host: verifyHost,
      slug,
      adminEmail,
      tempPassword: isNewUser ? tempPassword : null,
    });
    log.push(`verification: ${verification.passed ? 'PASSED' : 'FAILED'} — ${verification.checks.map((c) => `${c.name}:${c.ok ? 'ok' : 'FAIL'}`).join(' ')}`);

    // 10. Welcome email — only after verification passes. Retries, and on
    // final failure alerts ops (the temp password is the customer's only
    // key; a silent send failure would strand a paying customer).
    let welcomeSent = false;
    if (verification.passed) {
      const sendResult = await sendWelcomeEmail({
        tenantName: name,
        adminName,
        adminEmail,
        subdomain,
        customDomain,
        plan,
        deploymentPath,
        tempPassword: isNewUser ? tempPassword : null,
      });
      welcomeSent = sendResult.ok;
      log.push(sendResult.ok ? 'welcome email sent' : `welcome email FAILED after retries: ${sendResult.error}`);
      if (!sendResult.ok) {
        await opsAlert(
          `Welcome email failed for ${name}`,
          `Tenant ${slug} (${tenantId}) provisioned and verified, but the welcome email to ${adminEmail} failed:\n${sendResult.error}\n\n` +
          `Resend it (mints a fresh temp password):\n  POST /tenants/${tenantId}/resend-welcome`
        );
      }
    } else {
      log.push('welcome email withheld — verification failed');
      await opsAlert(
        `Provisioning verification FAILED for ${name}`,
        `Tenant ${slug} (${tenantId}) at https://${verifyHost} did not pass post-provision checks. ` +
        `The customer has NOT been emailed.\n\n` +
        verification.checks.map((c) => `  ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`).join('\n') +
        `\n\nFix the red items, then send credentials:\n  POST /tenants/${tenantId}/resend-welcome`
      );
    }

    res.json({
      ok: true,
      tenant: tenantRow,
      url: subdomainUrl(subdomain, customDomain),
      deployment_path: deploymentPath,
      verification,
      welcome_sent: welcomeSent,
      log,
    });
  } catch (e) {
    console.error('provision failed:', e);
    res.status(500).json({ error: 'provision_failed', detail: String(e?.message ?? e) });
  }
});

// Re-send credentials to a tenant's super-admin. Mints a fresh temp password
// (the old one is never stored), flags must_change_password, and sends the
// welcome email again. Recovery path for a failed verification or a failed
// original send.
app.post('/tenants/:id/resend-welcome', requireSuperAdmin, async (req, res) => {
  try {
    const tenantId = req.params.id;
    const { data: tenant } = await sa
      .from('gw_tenants')
      .select('id, slug, name, subdomain, custom_domain, plan')
      .eq('id', tenantId)
      .maybeSingle();
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });

    const { data: admins } = await sa
      .from('gw_tenant_members')
      .select('user_id, role, created_at')
      .eq('tenant_id', tenantId)
      .in('role', ['super-admin', 'super_admin'])
      .order('created_at', { ascending: true })
      .limit(1);
    const adminMember = (admins || [])[0];
    if (!adminMember) return res.status(404).json({ error: 'tenant_admin_not_found' });

    const { data: u } = await sa.auth.admin.getUserById(adminMember.user_id);
    const adminEmail = u?.user?.email;
    if (!adminEmail) return res.status(404).json({ error: 'admin_email_not_found' });

    const tempPassword = generateTempPassword();
    const { error: ue } = await sa.auth.admin.updateUserById(adminMember.user_id, {
      password: tempPassword,
      user_metadata: { ...(u.user.user_metadata || {}), must_change_password: true },
    });
    if (ue) return res.status(500).json({ error: 'password_reset_failed', detail: ue.message });

    const { data: branding } = await sa
      .from('gw_branding_settings')
      .select('setup_completed')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const sendResult = await sendWelcomeEmail({
      tenantName: tenant.name,
      adminName: u.user.user_metadata?.full_name || adminEmail.split('@')[0],
      adminEmail,
      subdomain: tenant.subdomain || tenant.slug,
      customDomain: tenant.custom_domain,
      plan: tenant.plan,
      deploymentPath: branding?.setup_completed === false ? 'self' : 'gleeworld',
      tempPassword,
    });
    if (!sendResult.ok) return res.status(502).json({ error: 'email_send_failed', detail: sendResult.error });
    res.json({ ok: true, sent_to: adminEmail });
  } catch (e) {
    res.status(500).json({ error: 'resend_failed', detail: String(e?.message ?? e) });
  }
});

// ───── Helpers ─────

// Post-provision verification: the site answers over HTTPS, serves the right
// tenant config (the SPA's actual database connection), the tenant's database
// wiring probes green, and — for new admins — the credentials work AND the
// issued JWT carries the NEW tenant's claim (catches stale-membership bugs).
async function verifyTenant({ tenantId, host, slug, adminEmail, tempPassword }) {
  const checks = [];

  // 1. HTTPS answers. Certbot ran synchronously during vhost provisioning,
  // but nginx reload + OCSP can lag a few seconds — retry up to 60s.
  let httpsOk = false, httpsDetail = '';
  for (let i = 0; i < 6 && !httpsOk; i++) {
    try {
      const r = await fetch(`https://${host}/`, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
      if (r.ok) httpsOk = true;
      else httpsDetail = `HTTP ${r.status}`;
    } catch (e) {
      httpsDetail = e.cause?.code || e.message;
    }
    if (!httpsOk && i < 5) await new Promise((r) => setTimeout(r, 10000));
  }
  checks.push({ name: 'https', ok: httpsOk, detail: httpsOk ? '' : httpsDetail });

  // 2. Tenant bootstrap — the config the SPA boots from. Must name this
  // tenant, carry an org (else the marketing landing renders), and point at
  // the database.
  let bootOk = false, bootDetail = '';
  try {
    const r = await fetch(`https://${host}/tenant-bootstrap.js`, { signal: AbortSignal.timeout(8000) });
    const text = r.ok ? await r.text() : '';
    if (!r.ok) bootDetail = `HTTP ${r.status}`;
    else if (!text.includes(`tenant: '${slug}'`)) bootDetail = 'wrong or missing tenant slug';
    else if (!text.includes('org:')) bootDetail = 'org missing — marketing page would render';
    else if (!text.includes('supabaseUrl')) bootDetail = 'supabaseUrl missing';
    else bootOk = true;
  } catch (e) { bootDetail = e.message; }
  checks.push({ name: 'bootstrap', ok: bootOk, detail: bootDetail });

  // 3. Database wiring — reuse the per-tenant health probe.
  let dbOk = false, dbDetail = '';
  try {
    const report = await runHealthCheck(tenantId);
    const red = (report.modules || []).filter((m) => m.status === 'red');
    dbOk = red.length === 0;
    dbDetail = dbOk ? `${report.summary.green} green / ${report.summary.yellow} yellow` : `red: ${red.map((m) => m.id).join(', ')}`;
  } catch (e) { dbDetail = e.message; }
  checks.push({ name: 'db-health', ok: dbOk, detail: dbDetail });

  // 4. Sign-in + tenant claim (new admins only — we don't know existing
  // users' passwords). Proves the credentials in the welcome email work and
  // that the JWT lands in THIS tenant, not an older membership.
  if (tempPassword) {
    let authOk = false, authDetail = '';
    try {
      const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data, error } = await anon.auth.signInWithPassword({ email: adminEmail, password: tempPassword });
      if (error) authDetail = error.message;
      else {
        const payload = JSON.parse(Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString());
        if (payload.tenant_id === tenantId) authOk = true;
        else authDetail = `JWT tenant_id=${payload.tenant_id || 'none'} ≠ ${tenantId} (stale membership claim)`;
        await anon.auth.signOut().catch(() => {});
      }
    } catch (e) { authDetail = e.message; }
    checks.push({ name: 'sign-in+claim', ok: authOk, detail: authDetail });
  }

  return { passed: checks.every((c) => c.ok), checks };
}

// Welcome email with retry. From GleeWorld (not the org's own name — a
// "welcome from yourself" next to a password reads phishy). Copy branches on
// deployment path.
async function sendWelcomeEmail({ tenantName, adminName, adminEmail, subdomain, customDomain, plan, deploymentPath, tempPassword }) {
  if (!resend) return { ok: false, error: 'resend not configured' };
  const tenantUrl = subdomainUrl(subdomain, customDomain);
  const signInUrl = `${tenantUrl}/auth`;
  const credentialsBlock = tempPassword
    ? `Sign in at ${signInUrl}\n` +
      `  Email: ${adminEmail}\n` +
      `  Temporary password: ${tempPassword}\n\n` +
      `You'll be asked to set your own password first thing.\n\n`
    : `Sign in at ${signInUrl} with your existing GleeWorld credentials.\n\n`;
  const nextSteps = deploymentPath === 'self'
    ? `The guided setup takes about 20 minutes:\n` +
      `  1. Branding — your name, logo, and colors\n` +
      `  2. Public page — the site your audience sees\n` +
      `  3. Roster — invite your students\n\n`
    : `We're designing your site now. You'll get a review link shortly — ` +
      `reply to this email any time with logo files, colors, photos, or copy.\n\n`;
  const text =
    `Hi ${adminName},\n\n` +
    `Your site is up, verified, and ready:\n\n` +
    `    ${tenantUrl}\n\n` +
    credentialsBlock +
    nextSteps +
    `Your plan: ${plan}. Billing lives in Workspace Settings.\n\n` +
    `Stuck anywhere? Reply to this email — a person reads it.\n\n` +
    `— The GleeWorld team`;

  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: `GleeWorld <${SENDER}>`,
        to: adminEmail,
        subject: `${tenantName} is live — here's how to get in`,
        text,
      });
      if (!error) return { ok: true };
      lastError = error.message || String(error);
    } catch (e) { lastError = e.message; }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 5000));
  }
  return { ok: false, error: lastError };
}

const OPS_EMAIL = process.env.OPS_EMAIL || `kevin@${ROOT_DOMAIN}`;
async function opsAlert(subject, body) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: `GleeWorld Provisioning <${SENDER}>`,
      to: OPS_EMAIL,
      subject: `🚨 ${subject}`,
      text: body,
    });
  } catch (e) { console.error('ops alert failed:', e.message); }
}

function clean(s, max) {
  return (s || '').toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, max);
}

// Memorable but secure temporary password — 3 random words + a 4-digit number
// + a special char. Long enough to satisfy any sensible policy and easy to
// type once during first sign-in. Wordlist intentionally short and common.
function generateTempPassword() {
  const words = ['Allegro', 'Cadenza', 'Crescendo', 'Forte', 'Harmony', 'Maestro', 'Octave', 'Rhythm', 'Sonata', 'Tempo', 'Treble', 'Vivace'];
  const w = () => words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  const sym = '!@#$%'[Math.floor(Math.random() * 5)];
  return `${w()}-${w()}-${n}${sym}`;
}
function shorten(s) {
  return (s || '').split(/\s+/).slice(0, 2).join(' ').slice(0, 32);
}
function subdomainUrl(subdomain, customDomain) {
  if (customDomain) return `https://${customDomain}`;
  return `https://${subdomain}.${ROOT_DOMAIN}`;
}
function nextBrandingId() {
  return Math.floor(Date.now() / 1000);
}
function removeVhost(slug, hostname) {
  return new Promise((resolve) => {
    const p = spawn(VHOST_REMOVE_SCRIPT, [slug, hostname]);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', () => {
      const lines = out.split('\n').filter(Boolean).map((l) => `[${hostname}] ${l}`);
      resolve(lines);
    });
    p.on('error', (e) => resolve([`[${hostname}] vhost remove error: ${e.message}`]));
  });
}

function provisionVhost(slug, hostname, orgName) {
  return new Promise((resolve) => {
    const p = spawn(VHOST_SCRIPT, orgName ? [slug, hostname, orgName] : [slug, hostname]);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', () => {
      const lines = out.split('\n').filter(Boolean).map((l) => `[${hostname}] ${l}`);
      resolve(lines);
    });
    p.on('error', (e) => resolve([`[${hostname}] vhost script error: ${e.message}`]));
  });
}

async function findUserByEmail(email) {
  // Paginate the admin list (we only expect a handful).
  let page = 1;
  for (;;) {
    const { data, error } = await sa.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const u = (data.users || []).find((x) => (x.email || '').toLowerCase() === email);
    if (u) return u;
    if (!data.users || data.users.length < 200) return null;
    page++;
  }
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`GleeWorld Super-Admin listening on 127.0.0.1:${PORT}`);
});
