// scripts/seed-demo-accounts.mjs
// Seed (or repair) the three prospect-facing demo accounts. Idempotent.
//
//   SUPABASE_URL=https://supabase.gleeworld.org \
//   SERVICE_ROLE_KEY=... \
//   DEMO_DIRECTOR_PASSWORD=... DEMO_STUDENT_PASSWORD=... DEMO_FAN_PASSWORD=... \
//   node scripts/seed-demo-accounts.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const ACCOUNTS = [
  // signupRole must pass handle_new_user_profile's whitelist; finalRole is
  // what the account should end up as (promoted below via service role).
  { email: 'demo-director@gleeworld.org', name: 'Dana Director', signupRole: 'member', finalRole: 'admin', passwordEnv: 'DEMO_DIRECTOR_PASSWORD' },
  { email: 'demo-student@gleeworld.org', name: 'Sam Student', signupRole: 'student', finalRole: 'student', passwordEnv: 'DEMO_STUDENT_PASSWORD' },
  { email: 'demo-fan@gleeworld.org', name: 'Frankie Fan', signupRole: 'fan', finalRole: 'fan', passwordEnv: 'DEMO_FAN_PASSWORD' },
];

for (const a of ACCOUNTS) {
  if (!process.env[a.passwordEnv]) {
    console.error(`${a.passwordEnv} is required`);
    process.exit(1);
  }
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: tenant, error: tenantErr } = await admin
  .from('gw_tenants').select('id').eq('slug', 'demo').single();
if (tenantErr || !tenant) {
  console.error('demo tenant not found:', tenantErr?.message);
  process.exit(1);
}

async function findUserByEmail(email) {
  // Paged scan — the instance has few enough users for this to be fine.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

for (const a of ACCOUNTS) {
  const password = process.env[a.passwordEnv];
  let user = await findUserByEmail(a.email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email,
      password,
      email_confirm: true,
      user_metadata: { tenant_slug: 'demo', role: a.signupRole, full_name: a.name },
    });
    if (error) throw new Error(`createUser ${a.email}: ${error.message}`);
    user = data.user;
    console.log(`created ${a.email} (${user.id})`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) throw new Error(`updateUser ${a.email}: ${error.message}`);
    console.log(`exists ${a.email} (${user.id}) — password refreshed`);
  }

  // Profile: enforce final role + read-only flag + demo tenant.
  const { data: profRows, error: profErr } = await admin
    .from('gw_profiles')
    .update({ role: a.finalRole, is_demo_viewer: true, tenant_id: tenant.id, status: 'active' })
    .eq('user_id', user.id)
    .select('user_id');
  if (profErr) throw new Error(`profile ${a.email}: ${profErr.message}`);
  if (!profRows?.length) {
    throw new Error(`profile ${a.email}: update matched 0 rows — handle_new_user_profile trigger missing?`);
  }

  // Membership: the trigger inserts one on signup; upsert covers repaired users.
  const { error: memErr } = await admin
    .from('gw_tenant_members')
    .upsert({ user_id: user.id, tenant_id: tenant.id, role: a.finalRole }, { onConflict: 'user_id,tenant_id' });
  if (memErr) throw new Error(`membership ${a.email}: ${memErr.message}`);

  console.log(`  ✓ ${a.email} → role=${a.finalRole}, is_demo_viewer=true`);
}

// Verify final state — this script's whole job is guaranteeing these rows.
const { data: check, error: checkErr } = await admin
  .from('gw_profiles')
  .select('email, role, is_demo_viewer, tenant_id, status')
  .in('email', ACCOUNTS.map((a) => a.email));
if (checkErr) throw new Error(`verification read failed: ${checkErr.message}`);
for (const a of ACCOUNTS) {
  const row = check?.find((r) => r.email === a.email);
  if (!row || row.role !== a.finalRole || row.is_demo_viewer !== true ||
      row.tenant_id !== tenant.id || row.status !== 'active') {
    throw new Error(`verification failed for ${a.email}: ${JSON.stringify(row)}`);
  }
}
console.log('done — all three accounts verified');
