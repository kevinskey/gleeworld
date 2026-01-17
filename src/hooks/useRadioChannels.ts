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
  is_active: boolean;
  is_default: boolean;
  type?: string;
}

export const useRadioChannels = () => {
  const [channels, setChannels] = useState<RadioChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<RadioChannel | null>(null);

  const fetchChannels = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('gw_radio_channels')
        .select('*')
        .eq('is_active', true)
        .eq('is_default', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching radio channels:', error);
        return;
      }

      console.log('Radio channels fetched:', data?.length, 'channels');
      setChannels(data || []);
      
      const savedChannelId = localStorage.getItem('gleeworld-radio-channel');
      const savedChannel = savedChannelId 
        ? data?.find(c => c.id === savedChannelId)
        : null;
      
      if (savedChannel) {
        setSelectedChannel(savedChannel);
      } else {
        const defaultChannel = data?.find(c => c.is_default) || data?.[0];
        if (defaultChannel) setSelectedChannel(defaultChannel);
      }
    } catch (error) {
      console.error('Error fetching radio channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const selectChannel = (channel: RadioChannel) => {
    setSelectedChannel(channel);
    localStorage.setItem('gleeworld-radio-channel', channel.id);
  };

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
    refetch: fetchChannels,
  };
};
