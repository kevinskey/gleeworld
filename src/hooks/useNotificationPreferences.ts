import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type NotificationPreferences = Database['public']['Tables']['gw_notification_preferences']['Row'];
type NotificationPreferencesUpdate = Database['public']['Tables']['gw_notification_preferences']['Update'];

type ProfilePhoneRow = {
  phone: string | null;
  phone_number: string | null;
};

const normalizePhoneValue = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  const mergeProfilePhoneIntoPreferences = (
    preferenceData: NotificationPreferences,
    profilePhone?: ProfilePhoneRow | null,
  ) => {
    const resolvedPhone = normalizePhoneValue(
      preferenceData.phone_number || profilePhone?.phone_number || profilePhone?.phone,
    );

    return {
      ...preferenceData,
      phone_number: resolvedPhone,
    };
  };

  const loadProfilePhone = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('gw_profiles')
      .select('phone, phone_number')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile phone:', error);
      return null;
    }

    return data;
  };

  // Load user preferences
  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [{ data, error }, profilePhone] = await Promise.all([
        supabase
          .from('gw_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        loadProfilePhone(),
      ]);

      if (error) {
        console.error('Error loading notification preferences:', error);
        return;
      }

      if (!data) {
        await createDefaultPreferences(profilePhone);
      } else {
        setPreferences(mergeProfilePhoneIntoPreferences(data, profilePhone));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create default preferences
  const createDefaultPreferences = async (profilePhone?: ProfilePhoneRow | null) => {
    if (!user) return;

    try {
      const defaultPhone = normalizePhoneValue(profilePhone?.phone_number || profilePhone?.phone);

      const { data, error } = await supabase
        .from('gw_notification_preferences')
        .upsert({
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
          marketing_emails: false,
          phone_number: defaultPhone,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error creating default preferences:', error);
        return;
      }

      if (data) {
        setPreferences(mergeProfilePhoneIntoPreferences(data, profilePhone));
      }
    } catch (error) {
      console.error('Error creating default preferences:', error);
    }
  };

  // Update preferences
  const updatePreferences = async (updates: NotificationPreferencesUpdate) => {
    if (!user || !preferences) return false;

    try {
      const normalizedPhone = Object.prototype.hasOwnProperty.call(updates, 'phone_number')
        ? normalizePhoneValue(updates.phone_number)
        : undefined;

      if (Object.prototype.hasOwnProperty.call(updates, 'phone_number')) {
        const { error: profileError } = await supabase
          .from('gw_profiles')
          .update({
            phone_number: normalizedPhone,
            phone: normalizedPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (profileError) {
          console.error('Error updating profile phone:', profileError);
          toast.error('Failed to update phone number');
          return false;
        }
      }

      const preferenceUpdates: NotificationPreferencesUpdate = {
        ...updates,
        ...(Object.prototype.hasOwnProperty.call(updates, 'phone_number')
          ? { phone_number: normalizedPhone }
          : {}),
      };

      const { data, error } = await supabase
        .from('gw_notification_preferences')
        .update(preferenceUpdates)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating preferences:', error);
        toast.error('Failed to update notification preferences');
        return false;
      }

      if (data) {
        setPreferences(mergeProfilePhoneIntoPreferences(data, {
          phone: normalizedPhone ?? null,
          phone_number: normalizedPhone ?? null,
        }));
        toast.success('Notification preferences updated');
      }
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
    updatePreferences,
  };
};