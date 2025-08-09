import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Collection {
  id: string;
  title: string;
  category: string | null;
  is_system: boolean;
  is_public: boolean;
  owner_id: string | null;
}

export interface CollectionItem {
  id: string;
  sheet_music_id: string;
  sheet?: { id: string; title: string; pdf_url: string | null } | null;
}

export const useCollections = (currentSelected?: { url: string; title: string; id?: string } | null) => {
  const { user } = useAuth();
  const [systemCollections, setSystemCollections] = useState<Collection[]>([]);
  const [myCollections, setMyCollections] = useState<Collection[]>([]);
  const [itemsByCollection, setItemsByCollection] = useState<Record<string, CollectionItem[]>>({});
  const [loading, setLoading] = useState(false);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_music_collections')
        .select('id,title,category,is_system,is_public,owner_id')
        .order('is_system', { ascending: false })
        .order('title');
      if (error) throw error;

      const sys = (data || []).filter((c) => c.is_system);
      const mine = (data || []).filter((c) => c.owner_id === user?.id && !c.is_system);
      setSystemCollections(sys as Collection[]);
      setMyCollections(mine as Collection[]);
    } catch (e) {
      console.error('Load collections failed', e);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const loadItems = useCallback(async (collectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_music_collection_items')
        .select('id, sheet_music_id')
        .eq('collection_id', collectionId)
        .order('position');
      if (error) throw error;

      const items = (data || []) as CollectionItem[];
      // Enrich with sheet music details
      if (items.length) {
        const ids = items.map((i) => i.sheet_music_id);
        const { data: sheets, error: sheetsErr } = await supabase
          .from('gw_sheet_music')
          .select('id,title,pdf_url')
          .in('id', ids);
        if (sheetsErr) throw sheetsErr;
        const map = new Map(sheets?.map((s) => [s.id, s]));
        items.forEach((i) => (i.sheet = map.get(i.sheet_music_id) as any));
      }

      setItemsByCollection((prev) => ({ ...prev, [collectionId]: items }));
    } catch (e) {
      console.error('Load collection items failed', e);
      toast.error('Failed to load collection items');
    }
  }, []);

  const createCollection = useCallback(async (title: string, category?: string) => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('gw_music_collections')
        .insert({ title, category: category || null, is_public: true, owner_id: user.id })
        .select('id,title,category,is_system,is_public,owner_id')
        .single();
      if (error) throw error;
      toast.success('Collection created');
      await loadCollections();
      return data as Collection;
    } catch (e) {
      console.error('Create collection failed', e);
      toast.error('Failed to create collection');
      return null;
    }
  }, [user?.id, loadCollections]);

  const addCurrentToCollection = useCallback(async (collectionId: string) => {
    if (!user?.id || !currentSelected?.id) {
      toast.error('Open a score to add');
      return false;
    }
    try {
      const { error } = await supabase
        .from('gw_music_collection_items')
        .insert({ collection_id: collectionId, sheet_music_id: currentSelected.id });
      if (error) throw error;
      toast.success('Added to collection');
      await loadItems(collectionId);
      return true;
    } catch (e: any) {
      if (e?.code === '23505') {
        toast('Already in collection');
        return true;
      }
      console.error('Add to collection failed', e);
      toast.error('Failed to add to collection');
      return false;
    }
  }, [user?.id, currentSelected, loadItems]);

  return { systemCollections, myCollections, itemsByCollection, loading, loadItems, createCollection, addCurrentToCollection };
};
