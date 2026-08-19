#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Import a user's scores into their GleeWorld "My Music" (personal library).
//
// PRIMARY MODE (gw_sheet_music, DB-driven — recommended): reads each row of the
// shared library table `gw_sheet_music` (authoritative title/composer/voicing +
// pdf_url), downloads the PDF, uploads it THROUGH the Supabase Storage API into
// the private `personal-scores` bucket at `<user_id>/uploads/<uuid>.pdf`, then
// inserts a `gw_personal_scores` row. This gives clean titles for every score,
// including ones whose object key is opaque. Downloading via the Storage API
// transparently handles the bucket's nested/flatten path layout.
//
// Other source modes (filename-derived titles): `s3` (a raw DO Space) and
// `supabase` (an existing bucket). Kept for reuse; the GleeWorld import uses
// gw_sheet_music.
//
// Resumable: a manifest records every processed source key, so a re-run skips
// finished work and is safe to Ctrl-C. Idempotent inserts (skips titles already
// in the library).
//
// ---- Prerequisites --------------------------------------------------------
//   • Run from the gleeworld repo root: `node scripts/import-personal-pdfs.mjs`
//   • SOURCE_MODE=s3 additionally needs: npm i --no-save @aws-sdk/client-s3
//     (gw_sheet_music and supabase modes need no extra deps.)
//
// ---- Configuration (environment variables) --------------------------------
//   TARGET (Supabase — supabase.gleeworld.org):
//     SUPABASE_URL                 e.g. https://supabase.gleeworld.org
//     SUPABASE_SERVICE_ROLE_KEY    service_role key (bypasses RLS for the import)
//     TARGET_USER_ID   OR  TARGET_USER_EMAIL   (email resolved via gw_profiles)
//
//   SOURCE — pick ONE mode (default gw_sheet_music):
//     SOURCE_MODE=gw_sheet_music
//       SOURCE_TABLE     table to read (default gw_sheet_music)
//       SOURCE_FILE_BUCKET  storage bucket the files live in (default sheet-music)
//       SKIP_CPDL_CACHE  "1" (default) drops rows whose file is a pd-cache/cpdl object
//     SOURCE_MODE=s3          SPACES_ENDPOINT/REGION/KEY/SECRET, SOURCE_BUCKET, SOURCE_PREFIX
//     SOURCE_MODE=supabase    SOURCE_BUCKET, SOURCE_PREFIX
//
//   OPTIONS:
//     DRY_RUN=1               list + plan only; no downloads, no writes
//     LIMIT=N                 process at most N items (great with DRY_RUN)
//     CONCURRENCY=4           parallel items (default 4)
//     MANIFEST=./import-manifest.json
//     MAX_MB=0                if >0, skip files larger than this many MB (0 = no limit)
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const PERSONAL_SCORES_BUCKET = 'personal-scores';

const env = (k, req = false) => {
  const v = process.env[k];
  if (req && (!v || !v.trim())) fail(`Missing required env var: ${k}`);
  return v;
};
function fail(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1); }

const DRY_RUN = process.env.DRY_RUN === '1';
const LIMIT = parseInt(process.env.LIMIT || '0', 10) || 0;
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '4', 10));
const MANIFEST_PATH = process.env.MANIFEST || './import-manifest.json';
const MAX_BYTES = (parseInt(process.env.MAX_MB || '0', 10) || 0) * 1024 * 1024;
const SOURCE_MODE = (process.env.SOURCE_MODE || 'gw_sheet_music').toLowerCase();
const SOURCE_PREFIX = process.env.SOURCE_PREFIX || '';
const SKIP_CPDL_CACHE = (process.env.SKIP_CPDL_CACHE || '1') === '1';

// ---- Title cleanup (filename modes only): strip a leading <epoch>- prefix,
//      turn separators into spaces, title-case, preserve voicing tokens -------
const VOICING_TOKENS = ['SATB', 'SSAA', 'SSA', 'SAB', 'TTBB', 'TTB', 'SA', 'TB', 'SATBB', 'SSAATTBB', 'UNISON'];
function cleanTitle(fileName) {
  let base = path.basename(fileName).replace(/\.pdf$/i, '');
  base = base.replace(/^\d{10,}[-_]/, ''); // drop leading epoch-ms upload prefix
  const words = base.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
  return words
    .map((w) => {
      const up = w.toUpperCase();
      if (VOICING_TOKENS.includes(up)) return up;
      if (/\d/.test(w)) return w;
      if (w === up && w.length > 1) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ').trim() || base;
}
function detectVoicing(name) {
  const up = name.toUpperCase();
  for (const t of VOICING_TOKENS) if (new RegExp(`(^|[^A-Z])${t}([^A-Z]|$)`).test(up)) return t;
  return null;
}

// Resolve a stored pdf_url (public CDN link, expired signed link, or bare path)
// to a (bucket, path) so we can pull it via the authenticated Storage API —
// which works for private buckets and ignores expired signatures. Falls back
// to a plain fetch only for genuinely external URLs.
function parseStorageRef(ref) {
  try {
    const u = new URL(ref);
    const p = u.pathname.replace(/^\/+/, '');
    let m = p.match(/^storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/);
    if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
    // DO Spaces / CDN host: first path segment is the storage bucket.
    if (/digitaloceanspaces\.com$/i.test(u.hostname)) {
      m = p.match(/^([^/]+)\/(.+)$/);
      if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
    }
  } catch { /* not a URL — treat as a bare path below */ }
  return null;
}
async function downloadRef(ref, fallbackBucket) {
  const parsed = parseStorageRef(ref)
    || (!/^https?:\/\//i.test(ref) && fallbackBucket ? { bucket: fallbackBucket, path: ref.replace(/^\/+/, '') } : null);
  if (parsed) {
    const { data, error } = await targetClient.storage.from(parsed.bucket).download(parsed.path);
    if (!error && data) return Buffer.from(await data.arrayBuffer());
    if (!/^https?:\/\//i.test(ref)) throw new Error(`storage ${parsed.bucket}/${parsed.path}: ${error?.message || 'not found'}`);
    // storage miss on a URL we could parse → fall through and try the URL itself
  }
  if (/^https?:\/\//i.test(ref)) {
    const res = await fetch(ref);
    if (!res.ok) throw new Error(`GET ${ref} -> HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`unresolvable ref: ${ref}`);
}

// ---- Manifest (resume) ----------------------------------------------------
async function loadManifest() {
  try { return JSON.parse(await readFile(MANIFEST_PATH, 'utf8')); } catch { return { entries: {} }; }
}
let manifest, manifestDirty = false;
async function flushManifest() {
  if (!manifestDirty) return;
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  manifestDirty = false;
}

// ---- Target (Supabase) ----------------------------------------------------
const targetClient = createClient(
  env('SUPABASE_URL', true),
  env('SUPABASE_SERVICE_ROLE_KEY', true),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function resolveUserId() {
  if (process.env.TARGET_USER_ID) return process.env.TARGET_USER_ID.trim();
  const email = env('TARGET_USER_EMAIL', true).trim().toLowerCase();
  const { data, error } = await targetClient
    .from('gw_profiles').select('user_id, email').ilike('email', email).limit(2);
  if (error) fail(`Could not look up user by email: ${error.message}`);
  if (!data?.length) fail(`No gw_profiles row for ${email}. Pass TARGET_USER_ID instead.`);
  if (data.length > 1) fail(`Multiple profiles match ${email}; pass TARGET_USER_ID.`);
  return data[0].user_id;
}

async function loadExistingTitles(userId) {
  const set = new Set();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await targetClient
      .from('gw_personal_scores').select('title').eq('user_id', userId).range(from, from + page - 1);
    if (error) fail(`Could not read existing personal scores: ${error.message}`);
    if (!data?.length) break;
    for (const r of data) set.add(r.title);
    if (data.length < page) break;
  }
  return set;
}

// ---- Source adapters ------------------------------------------------------
// Each item: { key, title?, composer?, voicing?, size? } + source.download(item) -> Buffer
async function makeSource() {
  if (SOURCE_MODE === 'space_public') {
    // Read a PUBLIC DO Space over plain HTTPS (no SDK, no keys). Titles come
    // from filenames (cleanTitle strips the leading upload-timestamp prefix).
    const base = (process.env.SPACE_BASE_URL || 'https://glee-world.sfo3.digitaloceanspaces.com').replace(/\/$/, '');
    const prefix = SOURCE_PREFIX || 'sheet-music/';
    const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    const encKey = (k) => k.split('/').map(encodeURIComponent).join('/');
    return {
      async list() {
        const out = [];
        let token = '';
        for (;;) {
          const url = `${base}/?list-type=2&max-keys=1000&prefix=${encodeURIComponent(prefix)}`
            + (token ? `&continuation-token=${encodeURIComponent(token)}` : '');
          const res = await fetch(url);
          if (!res.ok) fail(`Space listing failed: HTTP ${res.status}`);
          const xml = await res.text();
          for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) {
            const k = decode(m[1]);
            if (!/\.pdf$/i.test(k)) continue;
            if (SKIP_CPDL_CACHE && /pd-cache\/cpdl\//i.test(k)) continue;
            out.push({ key: `space:${k}`, ref: `${base}/${encKey(k)}`, title: null, size: null });
          }
          const nt = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
          if (/<IsTruncated>true<\/IsTruncated>/.test(xml) && nt) token = decode(nt[1]); else break;
        }
        return out;
      },
      async download(item) {
        const res = await fetch(item.ref);
        if (!res.ok) throw new Error(`GET ${item.ref} -> HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
      },
    };
  }

  if (SOURCE_MODE === 'gw_sheet_music') {
    const table = process.env.SOURCE_TABLE || 'gw_sheet_music';
    const fileBucket = process.env.SOURCE_FILE_BUCKET || 'sheet-music';
    let diagShown = false;
    return {
      async list() {
        const out = [];
        const page = 1000;
        for (let from = 0; ; from += page) {
          const { data, error } = await targetClient
            .from(table).select('*')
            .not('pdf_url', 'is', null)
            .range(from, from + page - 1);
          if (error) fail(`Could not read ${table}: ${error.message}`);
          if (!data?.length) break;
          if (!diagShown && data[0]) {
            diagShown = true;
            console.log(`  [diag] ${table} columns: ${Object.keys(data[0]).join(', ')}`);
            console.log(`  [diag] sample pdf_url: ${String(data[0].pdf_url).slice(0, 140)}`);
          }
          for (const r of data) {
            const ref = r.pdf_url || r.file_url || r.storage_path || '';
            if (!ref) continue; // no file to import
            if (SKIP_CPDL_CACHE && /pd-cache\/cpdl\//i.test(ref)) continue;
            out.push({
              key: `${table}:${r.id}`,
              title: (r.title || '').trim() || null,
              composer: (r.composer || '').trim() || null,
              voicing: (r.voicing || '').trim() || null,
              ref, bucket: fileBucket, size: null,
            });
          }
          if (data.length < page) break;
        }
        return out;
      },
      async download(item) {
        return downloadRef(item.ref, item.bucket);
      },
    };
  }

  const SOURCE_BUCKET = env('SOURCE_BUCKET', true);
  if (SOURCE_MODE === 'supabase') {
    const sb = targetClient;
    return {
      async list() {
        const out = [];
        const walk = async (prefix) => {
          let offset = 0;
          for (;;) {
            const { data, error } = await sb.storage.from(SOURCE_BUCKET)
              .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
            if (error) fail(`Supabase list "${prefix}": ${error.message}`);
            if (!data?.length) break;
            for (const it of data) {
              const full = prefix ? `${prefix}/${it.name}` : it.name;
              if (it.id === null) await walk(full);
              else if (/\.pdf$/i.test(it.name)) out.push({ key: full, ref: full, bucket: SOURCE_BUCKET, size: it.metadata?.size ?? null });
            }
            if (data.length < 100) break;
            offset += data.length;
          }
        };
        await walk(SOURCE_PREFIX.replace(/\/$/, ''));
        return out;
      },
      async download(item) {
        const { data, error } = await sb.storage.from(SOURCE_BUCKET).download(item.ref);
        if (error) throw new Error(`download ${item.ref}: ${error.message}`);
        return Buffer.from(await data.arrayBuffer());
      },
    };
  }

  // s3
  let S3;
  try { S3 = await import('@aws-sdk/client-s3'); }
  catch { fail('SOURCE_MODE=s3 needs the AWS SDK:  npm i --no-save @aws-sdk/client-s3'); }
  const client = new S3.S3Client({
    endpoint: env('SPACES_ENDPOINT', true), region: env('SPACES_REGION', true), forcePathStyle: false,
    credentials: { accessKeyId: env('SPACES_KEY', true), secretAccessKey: env('SPACES_SECRET', true) },
  });
  return {
    async list() {
      const out = []; let token;
      do {
        const res = await client.send(new S3.ListObjectsV2Command({ Bucket: SOURCE_BUCKET, Prefix: SOURCE_PREFIX, ContinuationToken: token }));
        for (const o of res.Contents || []) if (/\.pdf$/i.test(o.Key)) out.push({ key: o.Key, ref: o.Key, size: o.Size });
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token);
      return out;
    },
    async download(item) {
      const res = await client.send(new S3.GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: item.ref }));
      return Buffer.from(await res.Body.transformToByteArray());
    },
  };
}

async function importOne(src, item, userId, existingTitles, stats) {
  if (manifest.entries[item.key]?.status === 'done') { stats.skippedDone++; return; }

  const title = item.title || cleanTitle(item.key);
  if (existingTitles.has(title)) {
    manifest.entries[item.key] = { status: 'done', title, note: 'already in library (title match)' };
    manifestDirty = true; stats.skippedExisting++; return;
  }
  if (DRY_RUN) { stats.wouldImport++; if (stats.wouldImport <= 60) console.log(`  would import: "${title}"${item.composer ? `  — ${item.composer}` : ''}`); return; }

  const bytes = await src.download(item);
  if (MAX_BYTES && bytes.length > MAX_BYTES) {
    manifest.entries[item.key] = { status: 'skipped', title, error: `over MAX_MB (${bytes.length} bytes)` };
    manifestDirty = true; stats.skippedOversize++; return;
  }

  const storagePath = `${userId}/uploads/${randomUUID()}.pdf`;
  const up = await targetClient.storage.from(PERSONAL_SCORES_BUCKET)
    .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false });
  if (up.error) throw new Error(`upload: ${up.error.message}`);

  const row = { user_id: userId, title, source: 'upload', storage_path: storagePath };
  if (item.composer) row.composer = item.composer;
  const voicing = item.voicing || detectVoicing(item.key);
  if (voicing) row.voicing = voicing;

  const ins = await targetClient.from('gw_personal_scores').insert(row).select('id').single();
  if (ins.error || !ins.data?.id) {
    await targetClient.storage.from(PERSONAL_SCORES_BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`insert: ${ins.error?.message || 'no row returned (check permissions)'}`);
  }

  existingTitles.add(title);
  manifest.entries[item.key] = { status: 'done', title, storagePath, id: ins.data.id };
  manifestDirty = true; stats.imported++;
  console.log(`  ✓ ${title}`);
}

async function runPool(items, worker) {
  let i = 0, active = 0, done = 0;
  return new Promise((resolve) => {
    const pump = () => {
      while (active < CONCURRENCY && i < items.length) {
        const item = items[i++]; active++;
        worker(item)
          .catch((e) => { console.error(`  ✖ ${item.key}: ${e.message}`);
            manifest.entries[item.key] = { status: 'error', error: e.message }; manifestDirty = true; })
          .finally(async () => {
            active--; done++;
            if (done % 10 === 0) await flushManifest();
            if (i >= items.length && active === 0) { await flushManifest(); resolve(); } else pump();
          });
      }
    };
    pump();
  });
}

async function main() {
  console.log(`\nGleeWorld · import scores → My Music  (mode=${SOURCE_MODE}${DRY_RUN ? ', DRY RUN' : ''})`);
  manifest = await loadManifest();
  const userId = await resolveUserId();
  console.log(`  target user_id: ${userId}`);

  const src = await makeSource();
  console.log('  scanning source…');
  let items = await src.list();
  console.log(`  found ${items.length} importable score(s)${SKIP_CPDL_CACHE && SOURCE_MODE === 'gw_sheet_music' ? ' (CPDL public-domain cache excluded)' : ''}.`);
  if (LIMIT && items.length > LIMIT) { items = items.slice(0, LIMIT); console.log(`  LIMIT=${LIMIT} → processing first ${items.length}.`); }
  if (items.length === 0) { console.log('  nothing to do.\n'); return; }

  const existingTitles = DRY_RUN ? new Set() : await loadExistingTitles(userId);
  const stats = { imported: 0, skippedDone: 0, skippedExisting: 0, skippedOversize: 0, wouldImport: 0 };
  await runPool(items, (item) => importOne(src, item, userId, existingTitles, stats));
  await flushManifest();

  console.log('\n── summary ──────────────────────────────');
  if (DRY_RUN) console.log(`  would import : ${stats.wouldImport}`);
  else         console.log(`  imported     : ${stats.imported}`);
  console.log(`  already done : ${stats.skippedDone}`);
  console.log(`  already in library (title) : ${stats.skippedExisting}`);
  if (MAX_BYTES) console.log(`  skipped >MAX_MB: ${stats.skippedOversize}`);
  const errors = Object.values(manifest.entries).filter((e) => e.status === 'error').length;
  console.log(`  errors       : ${errors}  (see ${MANIFEST_PATH}; re-run to retry)`);
  console.log('─────────────────────────────────────────\n');
  if (errors > 0) process.exitCode = 1;
}

main().catch(async (e) => { await flushManifest().catch(() => {}); fail(e.stack || e.message); });
