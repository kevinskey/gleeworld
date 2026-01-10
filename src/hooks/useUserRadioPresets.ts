import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type RadioChannel } from '@/hooks/useRadioChannels';

export interface UserRadioPreset {
  id: string;
  user_id: string;
  channel_id: string;
  slot_number: number;
  created_at: string;
  updated_at: string;
  channel?: RadioChannel;
}

export const useUserRadioPresets = (channels: RadioChannel[]) => {
  const { user } = useAuth();
  const [presets, setPresets] = useState<UserRadioPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user's presets
  const fetchPresets = useCallback(async () => {
    if (!user) {
      // Return default presets (first 6 channels) for non-logged-in users
      const defaultPresets = channels.slice(0, 6).map((channel, idx) => ({
        id: `default-${idx}`,
        user_id: 'anonymous',
        channel_id: channel.id,
        slot_number: idx + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        channel,
      }));
      setPresets(defaultPresets);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_radio_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('slot_number', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Map channels to presets
        const presetsWithChannels = data.map(preset => ({
          ...preset,
          channel: channels.find(c => c.id === preset.channel_id),
        }));
        setPresets(presetsWithChannels);
      } else {
        // Initialize default presets for new users
        await initializeDefaultPresets();
      }
    } catch (err) {
      console.error('Error fetching presets:', err);
      setError(err as Error);
      // Fallback to default presets
      const defaultPresets = channels.slice(0, 6).map((channel, idx) => ({
        id: `default-${idx}`,
        user_id: user?.id || 'anonymous',
        channel_id: channel.id,
        slot_number: idx + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        channel,
      }));
      setPresets(defaultPresets);
    } finally {
      setIsLoading(false);
    }
  }, [user, channels]);

  // Initialize default presets for new users
  const initializeDefaultPresets = useCallback(async () => {
    if (!user || channels.length === 0) return;

    try {
      const defaultPresets = channels.slice(0, 6).map((channel, idx) => ({
        user_id: user.id,
        channel_id: channel.id,
        slot_number: idx + 1,
      }));

      const { data, error: insertError } = await supabase
        .from('user_radio_presets')
        .insert(defaultPresets)
        .select();

      if (insertError) throw insertError;

      if (data) {
        const presetsWithChannels = data.map(preset => ({
          ...preset,
          channel: channels.find(c => c.id === preset.channel_id),
        }));
        setPresets(presetsWithChannels);
      }
    } catch (err) {
      console.error('Error initializing default presets:', err);
    }
  }, [user, channels]);

  // Set a channel to a specific slot
  const setPresetSlot = useCallback(async (slotNumber: number, channel: RadioChannel) => {
    if (!user) return false;

    try {
      // First, remove the channel from any existing slot (to avoid duplicate)
      await supabase
        .from('user_radio_presets')
        .delete()
        .eq('user_id', user.id)
        .eq('channel_id', channel.id);

      // Then, upsert the new slot assignment
      const { data, error: upsertError } = await supabase
        .from('user_radio_presets')
        .upsert({
          user_id: user.id,
          channel_id: channel.id,
          slot_number: slotNumber,
        }, {
          onConflict: 'user_id,slot_number',
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      // Refresh presets
      await fetchPresets();
      return true;
    } catch (err) {
      console.error('Error setting preset slot:', err);
      setError(err as Error);
      return false;
    }
  }, [user, fetchPresets]);

  // Remove a preset from a slot
  const removePreset = useCallback(async (slotNumber: number) => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('user_radio_presets')
        .delete()
        .eq('user_id', user.id)
        .eq('slot_number', slotNumber);

      if (deleteError) throw deleteError;

      await fetchPresets();
      return true;
    } catch (err) {
      console.error('Error removing preset:', err);
      setError(err as Error);
      return false;
    }
  }, [user, fetchPresets]);

  // Get preset for a specific slot
  const getPresetForSlot = useCallback((slotNumber: number): UserRadioPreset | undefined => {
    return presets.find(p => p.slot_number === slotNumber);
  }, [presets]);

  // Fetch presets when user or channels change
  useEffect(() => {
    if (channels.length > 0) {
      fetchPresets();
    }
  }, [channels.length, user?.id]);

  return {
    presets,
    isLoading,
    error,
    setPresetSlot,
    removePreset,
    getPresetForSlot,
    refetchPresets: fetchPresets,
  };
};
