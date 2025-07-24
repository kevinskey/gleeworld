import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SpotlightContent {
  id: string;
  title: string;
  description?: string;
  content?: string;
  spotlight_type: string;
  featured_person_id?: string;
  featured_event_id?: string;
  image_url?: string;
  external_link?: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  publish_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  featured_person?: {
    id: string;
    full_name: string;
    email: string;
  };
  featured_event?: {
    id: string;
    title: string;
    start_date: string;
  };
}

export const useSpotlightContent = () => {
  const [spotlights, setSpotlights] = useState<SpotlightContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSpotlights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_spotlight_content')
        .select(`
          *,
          featured_person:featured_person_id(id, full_name, email),
          featured_event:featured_event_id(id, title, start_date)
        `)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpotlights((data as any) || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching spotlight content:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load spotlight content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSpotlight = async (spotlightData: Partial<SpotlightContent>) => {
    try {
      const { data, error } = await supabase
        .from('gw_spotlight_content')
        .insert(spotlightData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Spotlight content created successfully",
      });

      await fetchSpotlights();
      return data;
    } catch (err: any) {
      console.error('Error creating spotlight content:', err);
      toast({
        title: "Error",
        description: "Failed to create spotlight content",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateSpotlight = async (id: string, updates: Partial<SpotlightContent>) => {
    try {
      const { data, error } = await supabase
        .from('gw_spotlight_content')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Spotlight content updated successfully",
      });

      await fetchSpotlights();
      return data;
    } catch (err: any) {
      console.error('Error updating spotlight content:', err);
      toast({
        title: "Error",
        description: "Failed to update spotlight content",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteSpotlight = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_spotlight_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Spotlight content deleted successfully",
      });

      await fetchSpotlights();
    } catch (err: any) {
      console.error('Error deleting spotlight content:', err);
      toast({
        title: "Error",
        description: "Failed to delete spotlight content",
        variant: "destructive",
      });
      throw err;
    }
  };

  const toggleActiveStatus = async (id: string, isActive: boolean) => {
    try {
      await updateSpotlight(id, { is_active: isActive });
    } catch (err: any) {
      // Error already handled in updateSpotlight
      throw err;
    }
  };

  const toggleFeaturedStatus = async (id: string, isFeatured: boolean) => {
    try {
      await updateSpotlight(id, { is_featured: isFeatured });
    } catch (err: any) {
      // Error already handled in updateSpotlight
      throw err;
    }
  };

  const logAnalytics = async (spotlightId: string, actionType: 'view' | 'click' | 'share') => {
    try {
      await supabase
        .from('gw_spotlight_analytics')
        .insert([
          {
            spotlight_id: spotlightId,
            action_type: actionType,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            ip_address: null, // This would typically be set server-side
            user_agent: navigator.userAgent,
            referrer: document.referrer || null
          }
        ]);
    } catch (err: any) {
      console.error('Error logging analytics:', err);
      // Don't show toast for analytics errors to avoid annoying users
    }
  };

  useEffect(() => {
    fetchSpotlights();
  }, []);

  return {
    spotlights,
    loading,
    error,
    refetch: fetchSpotlights,
    createSpotlight,
    updateSpotlight,
    deleteSpotlight,
    toggleActiveStatus,
    toggleFeaturedStatus,
    logAnalytics
  };
};