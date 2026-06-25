// GleeWorld Video — shared types for the library + player.
//
// `source_path` is the original upload (MP4/MOV/WebM/etc) — what
// Phase 1 plays back directly. Phase 2 adds `hls_path` pointing at an
// HLS playlist transcoded by the FFmpeg worker; the player falls
// through to HLS when present, otherwise source.

export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface StudioVideo {
  id: string;
  tenant_id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  source_path: string;
  hls_path: string | null;
  thumb_path: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  mime: string | null;
  status: VideoStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioVideoListItem {
  id: string;
  title: string;
  status: VideoStatus;
  duration_seconds: number | null;
  size_bytes: number | null;
  thumb_path: string | null;
  created_at: string;
  updated_at: string;
}
