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
      // Add a small delay to ensure auth session is fully established
      const timer = setTimeout(() => {
        fetchPreferences();
      }, 100);
      return () => clearTimeout(timer);
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
        .maybeSingle();

      if (error) {
        // Silently log the error - don't show toast for preferences loading
        // as it's not critical and can happen during auth transitions
        console.warn('Could not load user preferences:', error.message);
        return;
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
      console.error('Unexpected error in fetchPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          tooltips_enabled: defaultPreferences.tooltips_enabled,
          tooltip_delay: defaultPreferences.tooltip_delay,
        }, { 
          onConflict: 'user_id' 
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error creating default preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          id: data.id,
          tooltips_enabled: data.tooltips_enabled,
          tooltip_delay: data.tooltip_delay,
        });
      }
    } catch (error) {
      console.error('Unexpected error in createDefaultPreferences:', error);
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