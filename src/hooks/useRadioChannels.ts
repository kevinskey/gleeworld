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

const isLegacyAzuraChannel = (channel: Pick<RadioChannel, 'type' | 'stream_url'>) => {
  const type = (channel.type || '').toLowerCase();
  const url = (channel.stream_url || '').toLowerCase();
  return (
    type === 'azuracast' ||
    url.includes('azuracast') ||
    url.includes('azura') ||
    url.includes('radio.gleeworld.org')
  );
};

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
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching radio channels:', error);
        return;
      }

      const activeChannels = (data || []).filter((c) => !isLegacyAzuraChannel(c));

      console.log('Radio channels fetched:', activeChannels.length, 'channels');
      setChannels(activeChannels);

      const savedChannelId = localStorage.getItem('gleeworld-radio-channel');
      const savedChannel = savedChannelId
        ? activeChannels.find((c) => c.id === savedChannelId)
        : null;

      if (savedChannel) {
        setSelectedChannel(savedChannel);
      } else {
        const defaultChannel = activeChannels.find((c) => c.is_default) || activeChannels[0];
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
      const savedChannel = channels.find((c) => c.id === savedChannelId);
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
