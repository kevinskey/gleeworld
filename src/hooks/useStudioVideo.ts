// React-side bindings for GleeWorld Video.

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  createUploadingVideo, deleteVideo, finalizeVideo, getPlaybackUrl,
  getThumbnailUrl, getVideo, listMyVideos, markVideoError, uploadVideoFile,
} from '@/lib/video/storage';
import type { StudioVideo, StudioVideoListItem } from '@/lib/video/types';

// Borrow the same owner-resolver used by the Studio audio side.
export function useVideoOwner() {
  return useQuery({
    queryKey: ['video-owner'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not signed in');
      const { data: profile, error } = await supabase
        .from('gw_profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!profile?.tenant_id) throw new Error('profile missing tenant_id');
      return { userId: user.id, tenantId: profile.tenant_id as string };
    },
    staleTime: 5 * 60_000,
  });
}

export function useMyVideos() {
  return useQuery<StudioVideoListItem[]>({
    queryKey: ['studio-videos'],
    queryFn: listMyVideos,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useVideo(id: string | null) {
  return useQuery<StudioVideo>({
    queryKey: ['studio-video', id],
    enabled: id !== null,
    queryFn: () => getVideo(id!),
    staleTime: 30_000,
  });
}

export function usePlaybackUrl(video: StudioVideo | null) {
  return useQuery({
    queryKey: ['studio-video-url', video?.id, video?.hls_path, video?.source_path],
    enabled: video !== null && video.status === 'ready',
    queryFn: () => getPlaybackUrl(video!),
    staleTime: 30 * 60_000,    // signed for 1h; refresh well before expiry
  });
}

export function useThumbnailUrl(video: { id: string; thumb_path: string | null } | null) {
  return useQuery({
    queryKey: ['studio-video-thumb', video?.id],
    enabled: video !== null && video.thumb_path !== null,
    queryFn: () => getThumbnailUrl(video!),
    staleTime: 30 * 60_000,
  });
}

export interface UploadProgress {
  pct: number;
  phase: 'creating' | 'uploading' | 'finalizing' | 'done';
}

export function useUploadVideo() {
  const owner = useVideoOwner();
  const qc = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const mut = useMutation({
    mutationFn: async (args: { file: File; title?: string }) => {
      if (!owner.data) throw new Error('no owner context');
      setProgress({ pct: 0, phase: 'creating' });

      const title = args.title?.trim() || args.file.name.replace(/\.[^.]+$/, '');
      const { video, uploadPath } = await createUploadingVideo({
        tenantId: owner.data.tenantId,
        ownerUserId: owner.data.userId,
        title,
        filename: args.file.name,
        size_bytes: args.file.size,
        mime: args.file.type || 'video/mp4',
      });

      try {
        setProgress({ pct: 0, phase: 'uploading' });
        await uploadVideoFile({
          uploadPath,
          file: args.file,
          onProgress: (pct) => setProgress({ pct, phase: 'uploading' }),
        });

        setProgress({ pct: 100, phase: 'finalizing' });
        // Try to read duration via a hidden <video> element. Best-effort
        // — many video formats (esp. MOV from iPhone) decode fine in
        // the browser; we silently skip on failure.
        const duration = await tryReadVideoDuration(args.file);
        await finalizeVideo({ id: video.id, duration_seconds: duration ?? undefined });

        setProgress({ pct: 100, phase: 'done' });
        return video.id;
      } catch (e) {
        await markVideoError(video.id, e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-videos'] }),
  });
  return { ...mut, progress };
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVideo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-videos'] }),
  });
}

async function tryReadVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : null;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    v.src = url;
  });
}

/** Polls 'uploading'/'processing' rows so the library page can update
 *  without a manual refresh once the worker (Phase 2) marks one ready. */
export function useVideoStatusPoll(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => qc.invalidateQueries({ queryKey: ['studio-videos'] }), 8000);
    return () => clearInterval(id);
  }, [enabled, qc]);
}
