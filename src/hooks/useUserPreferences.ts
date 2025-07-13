import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UserPreferences {
  id?: string;
  tooltips_enabled: boolean;
  tooltip_delay: number;
}

const defaultPreferences: UserPreferences = {
  tooltips_enabled: true,
  tooltip_delay: 200,
};

export const useUserPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          id: data.id,
          tooltips_enabled: data.tooltips_enabled,
          tooltip_delay: data.tooltip_delay,
        });
      } else {
        // Create default preferences for new user
        await createDefaultPreferences();
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load user preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          tooltips_enabled: defaultPreferences.tooltips_enabled,
          tooltip_delay: defaultPreferences.tooltip_delay,
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences({
        id: data.id,
        tooltips_enabled: data.tooltips_enabled,
        tooltip_delay: data.tooltip_delay,
      });
    } catch (error) {
      console.error('Error creating default preferences:', error);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user || !preferences.id) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('id', preferences.id);

      if (error) throw error;

      setPreferences(prev => ({ ...prev, ...updates }));
      
      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error", 
        description: "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  return {
    preferences,
    loading,
    updatePreferences,
  };
};