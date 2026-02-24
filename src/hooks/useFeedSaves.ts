import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FeedItem {
  title: string;
  link: string;
  description?: string;
  source?: string;
  sourceIcon?: string;
  imageUrl?: string | null;
  pubDate?: string;
}

interface FeedSave {
  id: string;
  feed_type: string;
  title: string;
  link: string;
  description: string | null;
  source: string | null;
  source_icon: string | null;
  image_url: string | null;
  pub_date: string | null;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
}

export const useFeedSaves = () => {
  const { user } = useAuth();
  const [saves, setSaves] = useState<Map<string, FeedSave>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadSaves = useCallback(async () => {
    if (!user) {
      setSaves(new Map());
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from('gw_feed_saves')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      const map = new Map<string, FeedSave>();
      (data || []).forEach((s: FeedSave) => map.set(s.link, s));
      setSaves(map);
    } catch (e) {
      console.error('Error loading feed saves:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadSaves(); }, [loadSaves]);

  const upsert = async (feedType: string, item: FeedItem, updates: { is_liked?: boolean; is_bookmarked?: boolean }) => {
    if (!user) { toast.error('Please sign in first'); return; }
    const existing = saves.get(item.link);
    const row = {
      user_id: user.id,
      feed_type: feedType,
      title: item.title,
      link: item.link,
      description: item.description || null,
      source: item.source || null,
      source_icon: item.sourceIcon || null,
      image_url: item.imageUrl || null,
      pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      is_liked: updates.is_liked ?? existing?.is_liked ?? false,
      is_bookmarked: updates.is_bookmarked ?? existing?.is_bookmarked ?? false,
    };
    try {
      const { data, error } = await (supabase as any)
        .from('gw_feed_saves')
        .upsert(row, { onConflict: 'user_id,link' })
        .select()
        .single();
      if (error) throw error;
      setSaves(prev => {
        const next = new Map(prev);
        if (!data.is_liked && !data.is_bookmarked) {
          next.delete(data.link);
          // clean up row
          (supabase as any).from('gw_feed_saves').delete().eq('id', data.id);
        } else {
          next.set(data.link, data);
        }
        return next;
      });
    } catch (e) {
      console.error('Error saving feed item:', e);
      toast.error('Failed to save');
    }
  };

  const toggleLike = (feedType: string, item: FeedItem) => {
    const existing = saves.get(item.link);
    upsert(feedType, item, { is_liked: !(existing?.is_liked ?? false) });
  };

  const toggleBookmark = (feedType: string, item: FeedItem) => {
    const existing = saves.get(item.link);
    upsert(feedType, item, { is_bookmarked: !(existing?.is_bookmarked ?? false) });
  };

  const share = async (item: FeedItem) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url: item.link });
      } else {
        await navigator.clipboard.writeText(item.link);
        toast.success('Link copied to clipboard');
      }
    } catch {
      // user cancelled share
    }
  };

  const isLiked = (link: string) => saves.get(link)?.is_liked ?? false;
  const isBookmarked = (link: string) => saves.get(link)?.is_bookmarked ?? false;

  const getAllSaves = () => Array.from(saves.values()).filter(s => s.is_liked || s.is_bookmarked);

  const removeSave = async (link: string) => {
    if (!user) return;
    try {
      await (supabase as any).from('gw_feed_saves').delete().eq('user_id', user.id).eq('link', link);
      setSaves(prev => { const next = new Map(prev); next.delete(link); return next; });
      toast.success('Removed from saved feed');
    } catch { toast.error('Failed to remove'); }
  };

  return { saves, loading, toggleLike, toggleBookmark, share, isLiked, isBookmarked, getAllSaves, removeSave, refresh: loadSaves };
};
