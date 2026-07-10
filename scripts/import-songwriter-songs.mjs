// One-off: import a single kpjsongwriting.com user's songs + recordings
// into GleeWorld. Needs the old Postgres reachable (direct or ssh tunnel)
// and the old uploads/recordings directory on local disk.
//   node scripts/import-songwriter-songs.mjs \
//     --email kpj64110@gmail.com --tenant <tenant-uuid>
// Env: OLD_DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      UPLOADS_DIR=<path to uploads/recordings>
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const email = arg('--email');
const tenantId = arg('--tenant');
if (!email || !tenantId) throw new Error('--email and --tenant required');

const old = new pg.Client({ connectionString: process.env.OLD_DATABASE_URL });
await old.connect();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Resolve users on both sides.
const { rows: [oldUser] } = await old.query('SELECT id FROM users WHERE email = $1', [email]);
if (!oldUser) throw new Error(`no old user for ${email}`);
const { data: page, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
const newUser = page.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!newUser) throw new Error(`no GleeWorld auth user for ${email}`);
console.log(`old user ${oldUser.id} -> ${newUser.id} (${email}), tenant ${tenantId}`);

// 2. Songs — JSONB shapes are identical by design; insert with explicit
//    tenant/user (service role bypasses RLS; the trigger only fills nulls).
//    Old app post-migration-005 uses the chord_charts ARRAY; the singular
//    chord_chart is legacy. Copy BOTH.
const { rows: songs } = await old.query('SELECT * FROM songs WHERE user_id = $1', [oldUser.id]);
const idMap = new Map();
for (const s of songs) {
  const { data, error } = await sb.from('gw_songs').insert({
    tenant_id: tenantId,
    user_id: newUser.id,
    title: s.title ?? 'Untitled song',
    sections: s.sections ?? [],
    notes: s.notes,
    tempo_bpm: s.tempo_bpm,
    key_signature: s.key_signature,
    graveyard: s.graveyard ?? [],
    chord_chart: s.chord_chart,
    chord_charts: s.chord_charts ?? [],
    created_at: s.created_at,
    updated_at: s.updated_at,
  }).select('id').single();
  if (error) throw new Error(`song "${s.title}": ${error.message}`);
  idMap.set(s.id, data.id);
  console.log(`song ok: ${s.title}`);
}

// 3. Recordings — upload file, then metadata (same order as the app).
const { rows: recs } = await old.query('SELECT * FROM recordings WHERE user_id = $1', [oldUser.id]);
let recOk = 0;
for (const r of recs) {
  const newSongId = idMap.get(r.song_id);
  if (!newSongId) { console.warn(`skip recording ${r.filename}: song not imported`); continue; }
  const file = path.join(process.env.UPLOADS_DIR, r.filename);
  if (!fs.existsSync(file)) { console.warn(`missing file ${file}`); continue; }
  const ext = path.extname(r.filename).slice(1) || 'webm';
  const key = `${tenantId}/${newUser.id}/${newSongId}/take-${Date.parse(r.created_at)}.${ext}`;
  const { error: upErr } = await sb.storage.from('songwriting')
    .upload(key, fs.readFileSync(file), { contentType: r.mime_type, upsert: true });
  if (upErr) { console.warn(`upload failed ${r.filename}: ${upErr.message}`); continue; }
  const { error } = await sb.from('gw_song_recordings').insert({
    tenant_id: tenantId, song_id: newSongId, user_id: newUser.id,
    storage_key: key, mime_type: r.mime_type,
    size_bytes: r.size_bytes ?? 0, duration_ms: r.duration_ms,
    created_at: r.created_at,
  });
  if (error) { console.warn(`meta failed ${r.filename}: ${error.message}`); continue; }
  recOk++;
}
console.log(`DONE: ${idMap.size}/${songs.length} songs, ${recOk}/${recs.length} recordings`);
await old.end();
