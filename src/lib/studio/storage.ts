// Storage helpers for Studio sessions. The DB row (gw_studio_sessions)
// is the index; the source of truth for the session itself is the
// manifest.json file in the "studio" bucket.
//
// Layout:
//   studio/<tenant_id>/sessions/<session_id>/manifest.json
//   studio/<tenant_id>/sessions/<session_id>/audio/<asset_id>.<ext>
//
// All paths start with the tenant uuid as the top folder — storage
// policies enforce per-tenant isolation off that prefix.

import { supabase } from '@/integrations/supabase/client';
import {
  STUDIO_SCHEMA_VERSION, type Session, type AudioAsset,
} from './session';
import { newId, newSession } from './defaults';
import { validateSession } from './validate';

const BUCKET = 'studio';

function manifestPath(prefix: string): string {
  return `${prefix}/manifest.json`;
}
function audioPath(prefix: string, assetId: string, format: AudioAsset['format']): string {
  return `${prefix}/audio/${assetId}.${format}`;
}
function sessionPrefix(tenantId: string, sessionId: string): string {
  return `${tenantId}/sessions/${sessionId}`;
}

// ── List the user's sessions ─────────────────────────────────────────

export interface SessionListItem {
  id: string;
  title: string;
  duration_seconds: number;
  track_count: number;
  asset_count: number;
  updated_at: string;
}

export async function listMySessions(): Promise<SessionListItem[]> {
  const { data, error } = await supabase
    .from('gw_studio_sessions')
    .select('id, title, duration_seconds, track_count, asset_count, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SessionListItem[];
}

// ── Create + index a fresh session ───────────────────────────────────

export async function createSession(args: {
  tenantId: string; ownerUserId: string; title?: string;
}): Promise<Session> {
  const session = newSession(args);
  const prefix = sessionPrefix(args.tenantId, session.id);

  // 1. Write the manifest first — if storage fails we don't want a
  //    DB row pointing at nothing.
  await writeManifest(prefix, session);

  // 2. Register the index row.
  const { error } = await supabase.from('gw_studio_sessions').insert({
    id: session.id,
    tenant_id: args.tenantId,
    owner_user_id: args.ownerUserId,
    title: session.title,
    schema_version: session.schema_version,
    storage_prefix: prefix,
    duration_seconds: session.length_seconds,
    track_count: 0,
    asset_count: 0,
  });
  if (error) {
    // Best-effort cleanup so an orphan manifest doesn't leak.
    await supabase.storage.from(BUCKET).remove([manifestPath(prefix)]);
    throw error;
  }
  return session;
}

// ── Load a session ───────────────────────────────────────────────────

export async function loadSession(sessionId: string): Promise<Session> {
  const { data: row, error } = await supabase
    .from('gw_studio_sessions')
    .select('storage_prefix')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error(`Session ${sessionId} not found`);

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET).download(manifestPath(row.storage_prefix));
  if (dlErr) throw dlErr;
  const text = await blob.text();
  const parsed = JSON.parse(text);
  const result = validateSession(parsed);
  if (!result.ok) {
    throw new Error('Session manifest invalid:\n' + result.errors.join('\n'));
  }
  return result.session;
}

// ── Save a session (manifest + index row) ────────────────────────────

export async function saveSession(session: Session): Promise<void> {
  const validated = validateSession(session);
  if (!validated.ok) {
    throw new Error('Refusing to save invalid session:\n' + validated.errors.join('\n'));
  }
  const prefix = sessionPrefix(session.tenant_id, session.id);
  session.updated_at = new Date().toISOString();
  await writeManifest(prefix, session);

  const { error } = await supabase.from('gw_studio_sessions').update({
    title: session.title,
    schema_version: session.schema_version,
    duration_seconds: session.length_seconds,
    track_count: session.tracks.length,
    asset_count: session.assets.length,
  }).eq('id', session.id);
  if (error) throw error;
}

async function writeManifest(prefix: string, session: Session): Promise<void> {
  const body = new Blob([JSON.stringify(session)], { type: 'application/json' });
  const { error } = await supabase.storage.from(BUCKET)
    .upload(manifestPath(prefix), body, { contentType: 'application/json', upsert: true });
  if (error) throw error;
}

// ── Upload an audio asset and return the AudioAsset metadata ─────────
//
// Caller is expected to have already decoded the file enough to know
// the duration, sample_rate, and channels (AudioContext.decodeAudioData
// gives all three).

export async function uploadAudioAsset(args: {
  tenantId: string;
  sessionId: string;
  file: File | Blob;
  filename: string;
  duration_seconds: number;
  sample_rate: number;
  channels: number;
}): Promise<AudioAsset> {
  const extMatch = args.filename.match(/\.([a-z0-9]+)$/i);
  const ext = (extMatch?.[1].toLowerCase() ?? 'wav') as AudioAsset['format'];
  const assetId = newId();
  const prefix = sessionPrefix(args.tenantId, args.sessionId);
  const path = audioPath(prefix, assetId, ext);

  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, args.file, { contentType: args.file.type || 'audio/wav', upsert: false });
  if (error) throw error;

  return {
    id: assetId,
    filename: args.filename,
    format: ext,
    duration_seconds: args.duration_seconds,
    sample_rate: args.sample_rate,
    channels: args.channels,
    size_bytes: 'size' in args.file ? args.file.size : 0,
  };
}

// ── Signed URL for playback ──────────────────────────────────────────
//
// The bucket is private; the engine fetches a signed URL good for a
// limited window when it needs to decode an asset for playback.

export async function getAssetUrl(args: {
  tenantId: string; sessionId: string; asset: AudioAsset;
  expiresInSeconds?: number;
}): Promise<string> {
  const prefix = sessionPrefix(args.tenantId, args.sessionId);
  const path = audioPath(prefix, args.asset.id, args.asset.format);
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(path, args.expiresInSeconds ?? 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ── Delete a session and all its assets ──────────────────────────────

export async function deleteSession(sessionId: string): Promise<void> {
  // SELECT may legitimately fail (RLS, stale JWT, wrong tenant). We
  // previously early-returned on `!row`, which silently faked success
  // and the row reappeared on the next refetch — looking to the user
  // like the delete button was broken. Now we surface the cause.
  const { data: row, error } = await supabase
    .from('gw_studio_sessions')
    .select('storage_prefix, owner_user_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!row) {
    throw new Error(
      `Could not load session ${sessionId} (it may belong to a different tenant, ` +
      'or your sign-in may need to be refreshed).',
    );
  }

  // List + remove storage objects. Errors here are tolerable — the
  // session row delete is the load-bearing step. We log but don't
  // throw so a transient Storage hiccup can't block the DB delete.
  try {
    const audioDir = `${row.storage_prefix}/audio`;
    const { data: list } = await supabase.storage.from(BUCKET).list(audioDir);
    const audioPaths = (list ?? []).map((o) => `${audioDir}/${o.name}`);
    const allPaths = [manifestPath(row.storage_prefix), ...audioPaths];
    if (allPaths.length) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(allPaths);
      if (rmErr) console.warn('[studio] storage remove failed (non-fatal):', rmErr.message);
    }
  } catch (e) {
    console.warn('[studio] storage cleanup raised, continuing to row delete:', e);
  }

  // Use `select()` so PostgREST returns the deleted rows. If RLS
  // silently rejects (DELETE on a row outside our scope returns 0 rows
  // with no error), we detect it here and throw — instead of letting
  // the UI show "Deleted" while the row stays put.
  const { data: deleted, error: delErr } = await supabase
    .from('gw_studio_sessions')
    .delete()
    .eq('id', sessionId)
    .select('id');
  if (delErr) throw delErr;
  if (!deleted || deleted.length === 0) {
    throw new Error(
      'Delete was blocked by access policy. Only the session owner can delete it ' +
      '(check that you are signed in as the user who created the session).',
    );
  }
}

export const STUDIO_BUCKET = BUCKET;
export { STUDIO_SCHEMA_VERSION };
