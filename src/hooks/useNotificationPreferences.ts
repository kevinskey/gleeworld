import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type NotificationPreferences = Database['public']['Tables']['gw_notification_preferences']['Row'];
type NotificationPreferencesUpdate = Database['public']['Tables']['gw_notification_preferences']['Update'];

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  // Load user preferences
  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading notification preferences:', error);
        return;
      }

      if (!data) {
        // Create default preferences
        await createDefaultPreferences();
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create default preferences
  const createDefaultPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('gw_notification_preferences')
        .insert({
          user_id: user.id,
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          announcement_email: true,
          announcement_sms: false,
          event_reminders: true,
          contract_updates: true,
          attendance_alerts: true,
          financial_updates: false,
          marketing_emails: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default preferences:', error);
        return;
      }

      setPreferences(data);
    } catch (error) {
      console.error('Error creating default preferences:', error);
    }
  };

  // Update preferences
  const updatePreferences = async (updates: NotificationPreferencesUpdate) => {
    if (!user || !preferences) return false;
    
    try {
      const { data, error } = await supabase
        .from('gw_notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        toast.error('Failed to update notification preferences');
        return false;
      }

      setPreferences(data);
      toast.success('Notification preferences updated');
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update notification preferences');
      return false;
    }
  };

  // Load preferences on mount
  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  return {
    preferences,
    loading,
    loadPreferences,
    updatePreferences
  };
};