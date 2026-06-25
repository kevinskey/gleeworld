// Storage helpers for GleeWorld Video. The DB row is the index; the
// raw bytes live in Supabase Storage under:
//
//   studio-video/<tenant_id>/videos/<video_id>/source.<ext>
//   studio-video/<tenant_id>/videos/<video_id>/hls/index.m3u8   (Phase 2)
//   studio-video/<tenant_id>/videos/<video_id>/thumb.jpg        (Phase 2)
//
// Upload flow (Phase 1):
//   1. createUploadingVideo() inserts the DB row in 'uploading' state.
//   2. Client uploads the file directly to Supabase storage.
//   3. finalizeVideo() flips status to 'ready' with duration + mime.
//
// Phase 2 will insert a 'processing' step where the FFmpeg worker
// transcodes to HLS and populates hls_path + thumb_path.

import { supabase } from '@/integrations/supabase/client';
import type { StudioVideo, StudioVideoListItem } from './types';

const BUCKET = 'studio-video';

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2) + Date.now().toString(36);

function videoPrefix(tenantId: string, videoId: string): string {
  return `${tenantId}/videos/${videoId}`;
}

export function sourcePath(tenantId: string, videoId: string, ext: string): string {
  return `${videoPrefix(tenantId, videoId)}/source.${ext.toLowerCase()}`;
}

// ── List ─────────────────────────────────────────────────────────────

export async function listMyVideos(): Promise<StudioVideoListItem[]> {
  const { data, error } = await supabase
    .from('gw_studio_videos')
    .select('id, title, status, duration_seconds, size_bytes, thumb_path, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudioVideoListItem[];
}

// ── Get one ──────────────────────────────────────────────────────────

export async function getVideo(id: string): Promise<StudioVideo> {
  const { data, error } = await supabase
    .from('gw_studio_videos').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Video ${id} not found`);
  return data as StudioVideo;
}

// ── Create + finalize ────────────────────────────────────────────────

export async function createUploadingVideo(args: {
  tenantId: string;
  ownerUserId: string;
  title: string;
  filename: string;
  size_bytes: number;
  mime: string;
}): Promise<{ video: { id: string; source_path: string }; uploadPath: string }> {
  const id = newId();
  const extMatch = args.filename.match(/\.([a-z0-9]+)$/i);
  const ext = (extMatch?.[1] ?? 'mp4').toLowerCase();
  const path = sourcePath(args.tenantId, id, ext);

  const { error } = await supabase.from('gw_studio_videos').insert({
    id,
    tenant_id: args.tenantId,
    owner_user_id: args.ownerUserId,
    title: args.title,
    source_path: path,
    size_bytes: args.size_bytes,
    mime: args.mime,
    status: 'uploading',
  });
  if (error) throw error;

  return { video: { id, source_path: path }, uploadPath: path };
}

export async function uploadVideoFile(args: {
  uploadPath: string;
  file: File | Blob;
  onProgress?: (pct: number) => void;
}): Promise<void> {
  // The supabase-js storage client doesn't expose progress yet, but it
  // accepts a duplex blob upload. For now we just await — Phase 2 will
  // switch to a presigned PUT direct to the S3 endpoint with XHR for
  // real progress events.
  args.onProgress?.(0);
  const { error } = await supabase.storage.from(BUCKET).upload(args.uploadPath, args.file, {
    contentType: args.file.type || 'video/mp4',
    upsert: false,
  });
  if (error) throw error;
  args.onProgress?.(100);
}

export async function finalizeVideo(args: {
  id: string;
  duration_seconds?: number;
}): Promise<void> {
  const patch: Record<string, unknown> = { status: 'ready' };
  if (args.duration_seconds !== undefined) patch.duration_seconds = args.duration_seconds;
  const { error } = await supabase.from('gw_studio_videos').update(patch).eq('id', args.id);
  if (error) throw error;
}

export async function markVideoError(id: string, message: string): Promise<void> {
  await supabase.from('gw_studio_videos').update({
    status: 'error', error_message: message,
  }).eq('id', id);
}

// ── Playback URL ─────────────────────────────────────────────────────

export async function getPlaybackUrl(video: StudioVideo, expiresInSeconds = 3600): Promise<string> {
  // Phase 2: prefer HLS playlist when present.
  const path = video.hls_path ?? video.source_path;
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function getThumbnailUrl(video: { thumb_path: string | null }, expiresInSeconds = 3600): Promise<string | null> {
  if (!video.thumb_path) return null;
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(video.thumb_path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

// ── Delete ───────────────────────────────────────────────────────────

export async function deleteVideo(id: string): Promise<void> {
  const { data: row } = await supabase
    .from('gw_studio_videos').select('source_path, hls_path, thumb_path').eq('id', id).maybeSingle();
  if (row) {
    // Remove every object under the video's prefix. Source path is
    // tenant/videos/<id>/source.<ext>; the parent dir is the prefix
    // we want to wipe.
    const m = row.source_path.match(/^(.+\/videos\/[^/]+)\//);
    if (m) {
      const prefix = m[1];
      const { data: list } = await supabase.storage.from(BUCKET).list(prefix);
      const paths = (list ?? []).map((o) => `${prefix}/${o.name}`);
      // Also recurse into hls/ subfolder if it exists.
      const { data: hlsList } = await supabase.storage.from(BUCKET).list(`${prefix}/hls`);
      if (hlsList?.length) paths.push(...hlsList.map((o) => `${prefix}/hls/${o.name}`));
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    }
  }
  const { error } = await supabase.from('gw_studio_videos').delete().eq('id', id);
  if (error) throw error;
}

export const STUDIO_VIDEO_BUCKET = BUCKET;
