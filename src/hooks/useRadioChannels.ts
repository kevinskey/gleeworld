import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RadioChannel {
  id: string;
  name: string;
  description: string | null;
  stream_url: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_default: boolean;
}

export const useRadioChannels = () => {
  const [channels, setChannels] = useState<RadioChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<RadioChannel | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_radio_channels')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching radio channels:', error);
          return;
        }

        setChannels(data || []);
        
        // Set default channel or first available
        const defaultChannel = data?.find(c => c.is_default) || data?.[0];
        if (defaultChannel && !selectedChannel) {
          setSelectedChannel(defaultChannel);
        }
      } catch (error) {
        console.error('Error fetching radio channels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, []);

  const selectChannel = (channel: RadioChannel) => {
    setSelectedChannel(channel);
    // Store preference in localStorage
    localStorage.setItem('gleeworld-radio-channel', channel.id);
  };

  // Restore saved channel preference on mount
  useEffect(() => {
    const savedChannelId = localStorage.getItem('gleeworld-radio-channel');
    if (savedChannelId && channels.length > 0) {
      const savedChannel = channels.find(c => c.id === savedChannelId);
      if (savedChannel) {
        setSelectedChannel(savedChannel);
      }
    }
  }, [channels]);

  return {
    channels,
    selectedChannel,
    selectChannel,
    isLoading,
  };
};
