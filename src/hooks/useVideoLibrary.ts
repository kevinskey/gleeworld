// Video-library sharing + personal playlists. Talks to three tables
// added in 20260722161133_video_library_playlists_and_shares.sql:
//
//   gw_video_playlists       user-owned collections
//   gw_video_playlist_items  join table
//   gw_video_shares          polymorphic share ledger
//
// These tables are NOT in the generated types.ts yet — casts to `any`
// below reflect that, not a design opinion. When the types are
// regenerated (supabase gen types), the casts can drop.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFrom = any;

export interface Playlist {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  cover_video_id: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  video_id: string;
  display_order: number;
  added_at: string;
}

export type ShareResourceType = 'video' | 'playlist' | 'category';
export type ShareRecipientType = 'user' | 'course' | 'group';

export interface VideoShare {
  id: string;
  resource_type: ShareResourceType;
  resource_id: string | null;
  resource_category: string | null;
  recipient_type: ShareRecipientType;
  recipient_id: string;
  shared_by: string;
  permission: 'view' | 'comment' | 'edit';
  note: string | null;
  created_at: string;
}

export function usePersonalPlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) { setPlaylists([]); setLoading(false); return; }

    const { data } = await (supabase as AnyFrom)
      .from('gw_video_playlists')
      .select('id, owner_id, title, description, is_public, cover_video_id, created_at, updated_at')
      .eq('owner_id', uid)
      .order('updated_at', { ascending: false });

    const rows: Playlist[] = (data || []) as Playlist[];

    // Count items per playlist so the list can show "4 videos".
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const { data: counts } = await (supabase as AnyFrom)
        .from('gw_video_playlist_items')
        .select('playlist_id')
        .in('playlist_id', ids);
      const tally: Record<string, number> = {};
      for (const c of (counts as { playlist_id: string }[] | null) || []) {
        tally[c.playlist_id] = (tally[c.playlist_id] || 0) + 1;
      }
      for (const r of rows) r.item_count = tally[r.id] || 0;
    }

    setPlaylists(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (title: string, description?: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) return null;
    const { data, error } = await (supabase as AnyFrom)
      .from('gw_video_playlists')
      .insert({ owner_id: uid, title, description: description || null })
      .select('id, owner_id, title, description, is_public, cover_video_id, created_at, updated_at')
      .single();
    if (error) return null;
    await load();
    return data as Playlist;
  }, [load]);

  const rename = useCallback(async (id: string, title: string) => {
    await (supabase as AnyFrom)
      .from('gw_video_playlists')
      .update({ title })
      .eq('id', id);
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await (supabase as AnyFrom)
      .from('gw_video_playlists')
      .delete()
      .eq('id', id);
    await load();
  }, [load]);

  const addVideo = useCallback(async (playlistId: string, videoId: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id ?? null;
    // display_order = current max + 1 so items append.
    const { data: existing } = await (supabase as AnyFrom)
      .from('gw_video_playlist_items')
      .select('display_order')
      .eq('playlist_id', playlistId)
      .order('display_order', { ascending: false })
      .limit(1);
    const next = ((existing as { display_order: number }[] | null)?.[0]?.display_order ?? -1) + 1;
    const { error } = await (supabase as AnyFrom)
      .from('gw_video_playlist_items')
      .insert({ playlist_id: playlistId, video_id: videoId, display_order: next, added_by: uid });
    return error;
  }, []);

  return { playlists, loading, refresh: load, create, rename, remove, addVideo };
}

export function useSharedWithMe() {
  const [shares, setShares] = useState<VideoShare[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // RLS on gw_video_shares scopes reads to (me as sharer OR me as
    // user-recipient OR the course-recipient shares my courses can see).
    // So a select-all here Just Works and returns the right subset.
    const { data } = await (supabase as AnyFrom)
      .from('gw_video_shares')
      .select('id, resource_type, resource_id, resource_category, recipient_type, recipient_id, shared_by, permission, note, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    // Only shares TO me (not my outbound shares).
    const rows: VideoShare[] = ((data as VideoShare[]) || []).filter(
      (s) => s.recipient_type !== 'user' || s.recipient_id === uid || s.shared_by !== uid
    ).filter((s) => s.shared_by !== uid);
    setShares(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { shares, loading, refresh: load };
}

export async function shareResource(params: {
  resourceType: ShareResourceType;
  resourceId?: string;
  resourceCategory?: string;
  recipientType: ShareRecipientType;
  recipientId: string;
  permission?: 'view' | 'comment' | 'edit';
  note?: string;
}) {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return { error: new Error('Not signed in') };
  const insertRow: Record<string, unknown> = {
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    resource_category: params.resourceCategory ?? null,
    recipient_type: params.recipientType,
    recipient_id: params.recipientId,
    shared_by: uid,
    permission: params.permission ?? 'view',
    note: params.note ?? null,
  };
  const { error } = await (supabase as AnyFrom)
    .from('gw_video_shares')
    .insert(insertRow);
  return { error };
}
