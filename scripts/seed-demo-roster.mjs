// scripts/seed-demo-roster.mjs
// Seed 12 fictional Harmony Hall Choir students into the demo tenant so the
// roster, attendance, and messaging screens look alive. Idempotent.
//
//   SUPABASE_URL=https://supabase.gleeworld.org SERVICE_ROLE_KEY=... \
//   node scripts/seed-demo-roster.mjs

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SERVICE_ROLE_KEY are required');
  process.exit(1);
}

// Fictional names — no real people, no institution references.
const STUDENTS = [
  'Amara Fields', 'Jordan Blake', 'Priya Raman', 'Marcus Bell',
  'Sofia Alvarez', 'Tyler Nguyen', 'Zoe Whitfield', 'Elias Grant',
  'Naomi Carter', 'Deshawn Reed', 'Lily Okafor', 'Gabriel Santos',
];

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: tenant, error: tErr } = await admin
  .from('gw_tenants').select('id').eq('slug', 'demo').single();
if (tErr || !tenant) { console.error('demo tenant not found'); process.exit(1); }

for (const name of STUDENTS) {
  const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@demo.harmonyhall.example`;
  const { data: existing } = await admin
    .from('gw_profiles').select('user_id').eq('email', email).maybeSingle();
  if (existing) { console.log(`exists ${email}`); continue; }

  // Random throwaway password — these accounts are roster dressing, never logins.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: randomBytes(24).toString('base64'),
    email_confirm: true,
    user_metadata: { tenant_slug: 'demo', role: 'student', full_name: name },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  console.log(`created ${email} (${data.user.id})`);

  const { error: flagErr } = await admin
    .from('gw_profiles')
    .update({ is_demo_viewer: true })
    .eq('user_id', data.user.id);
  if (flagErr) throw new Error(`${email} is_demo_viewer: ${flagErr.message}`);
}

console.log('done');
