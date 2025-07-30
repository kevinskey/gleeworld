import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PressKit {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  is_public: boolean;
  is_featured: boolean;
  template_type: string;
  status: 'draft' | 'published' | 'archived';
  metadata: any;
  created_at: string;
  updated_at: string;
  items?: PressKitItem[];
}

export interface PressKitItem {
  id: string;
  press_kit_id: string;
  item_type: 'image' | 'document' | 'press_release' | 'bio' | 'fact_sheet' | 'logo' | 'video';
  title: string;
  description?: string;
  file_path?: string;
  file_url?: string;
  content?: string;
  metadata: any;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface PressKitShare {
  id: string;
  press_kit_id: string;
  shared_by: string;
  recipient_email?: string;
  recipient_name?: string;
  access_token: string;
  expires_at?: string;
  downloaded_at?: string;
  view_count: number;
  created_at: string;
}

export const usePressKits = () => {
  const [pressKits, setPressKits] = useState<PressKit[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPressKits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('press_kits')
        .select(`
          *,
          items:press_kit_items(*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPressKits((data || []) as PressKit[]);
    } catch (error) {
      console.error('Error fetching press kits:', error);
      toast({
        title: "Error",
        description: "Failed to load press kits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPressKit = async (pressKit: {
    title: string;
    description?: string;
    template_type?: string;
    is_public?: boolean;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('press_kits')
        .insert({
          ...pressKit,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Press kit created successfully",
      });

      fetchPressKits();
      return data;
    } catch (error) {
      console.error('Error creating press kit:', error);
      toast({
        title: "Error",
        description: "Failed to create press kit",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePressKit = async (id: string, updates: Partial<PressKit>) => {
    try {
      const { error } = await supabase
        .from('press_kits')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Press kit updated successfully",
      });

      fetchPressKits();
    } catch (error) {
      console.error('Error updating press kit:', error);
      toast({
        title: "Error",
        description: "Failed to update press kit",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePressKit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('press_kits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Press kit deleted successfully",
      });

      fetchPressKits();
    } catch (error) {
      console.error('Error deleting press kit:', error);
      toast({
        title: "Error",
        description: "Failed to delete press kit",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addItemToPressKit = async (pressKitId: string, item: {
    item_type: PressKitItem['item_type'];
    title: string;
    description?: string;
    file_path?: string;
    file_url?: string;
    content?: string;
    metadata?: any;
    sort_order?: number;
    is_featured?: boolean;
  }) => {
    try {
      const { data, error } = await supabase
        .from('press_kit_items')
        .insert({
          press_kit_id: pressKitId,
          ...item,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added to press kit successfully",
      });

      fetchPressKits();
      return data;
    } catch (error) {
      console.error('Error adding item to press kit:', error);
      toast({
        title: "Error",
        description: "Failed to add item to press kit",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePressKitItem = async (id: string, updates: Partial<PressKitItem>) => {
    try {
      const { error } = await supabase
        .from('press_kit_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Press kit item updated successfully",
      });

      fetchPressKits();
    } catch (error) {
      console.error('Error updating press kit item:', error);
      toast({
        title: "Error",
        description: "Failed to update press kit item",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePressKitItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('press_kit_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Press kit item deleted successfully",
      });

      fetchPressKits();
    } catch (error) {
      console.error('Error deleting press kit item:', error);
      toast({
        title: "Error",
        description: "Failed to delete press kit item",
        variant: "destructive",
      });
      throw error;
    }
  };

  const sharePressKit = async (pressKitId: string, share: {
    recipient_email?: string;
    recipient_name?: string;
    expires_at?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate a secure access token
      const accessToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from('press_kit_shares')
        .insert({
          press_kit_id: pressKitId,
          shared_by: user.id,
          access_token: accessToken,
          ...share,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Press kit shared successfully",
      });

      return data;
    } catch (error) {
      console.error('Error sharing press kit:', error);
      toast({
        title: "Error",
        description: "Failed to share press kit",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPressKits();
  }, []);

  return {
    pressKits,
    loading,
    createPressKit,
    updatePressKit,
    deletePressKit,
    addItemToPressKit,
    updatePressKitItem,
    deletePressKitItem,
    sharePressKit,
    refreshPressKits: fetchPressKits,
  };
};