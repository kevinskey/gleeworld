import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { azuraCastService } from '@/services/azuracast';

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
  // AzuraCast specific fields
  azura_playlist_id?: number;
  type?: string;
}

export const useRadioChannels = () => {
  const [channels, setChannels] = useState<RadioChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<RadioChannel | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Fetch from database (stations are synced from AzuraCast)
        const { data, error } = await supabase
          .from('gw_radio_channels')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching radio channels:', error);
          return;
        }

        console.log('Radio channels fetched:', data);
        setChannels(data || []);
        
        // Set default channel from localStorage or find default
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

    fetchChannels();
  }, []);

  const [isRequesting, setIsRequesting] = useState(false);
  const [lastRequestMessage, setLastRequestMessage] = useState<string | null>(null);

  const selectChannel = (channel: RadioChannel) => {
    setSelectedChannel(channel);
    // Store preference in localStorage
    localStorage.setItem('gleeworld-radio-channel', channel.id);
  };

  // Request a song from the selected playlist (on-demand feature)
  // Auto-retries with different songs if rejected due to "played too recently"
  const requestSongFromChannel = async (channel: RadioChannel, maxRetries: number = 3): Promise<{ success: boolean; message: string }> => {
    if (!channel.azura_playlist_id) {
      return { success: false, message: 'No playlist ID available' };
    }
    
    setIsRequesting(true);
    setLastRequestMessage(null);
    
    let lastError = '';
    const triedSongIds = new Set<string>();
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await azuraCastService.requestSongFromPlaylist(channel.azura_playlist_id, triedSongIds);
        
        // Track which song we tried
        if (result.song?.id) {
          triedSongIds.add(String(result.song.id));
        }
        
        if (result.success) {
          setLastRequestMessage(result.message);
          setIsRequesting(false);
          return result;
        }
        
        // Check if it's a "played too recently" error
        const isRecentlyPlayed = result.message?.toLowerCase().includes('recently') || 
                                 result.message?.toLowerCase().includes('cooldown') ||
                                 result.message?.toLowerCase().includes('wait');
        
        if (isRecentlyPlayed && attempt < maxRetries - 1) {
          console.log(`Song rejected (attempt ${attempt + 1}/${maxRetries}), trying another...`);
          lastError = result.message;
          continue;
        }
        
        lastError = result.message;
        break;
      } catch (error: any) {
        lastError = error.message || 'Request failed';
        
        // Check if it's a cooldown error and we should retry
        const isRecentlyPlayed = lastError.toLowerCase().includes('recently') || 
                                 lastError.toLowerCase().includes('cooldown') ||
                                 lastError.toLowerCase().includes('wait');
        
        if (isRecentlyPlayed && attempt < maxRetries - 1) {
          console.log(`Request rejected (attempt ${attempt + 1}/${maxRetries}), trying another song...`);
          continue;
        }
        break;
      }
    }
    
    // All retries failed
    const message = `All songs on cooldown. Try a different playlist or wait a moment.`;
    setLastRequestMessage(message);
    setIsRequesting(false);
    return { success: false, message };
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
    requestSongFromChannel,
    isRequesting,
    lastRequestMessage,
    isLoading,
  };
};

// Helper functions to assign icons and colors based on station name
function getStationIcon(name: string): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('gospel')) return 'Church';
  if (nameLower.includes('spiritual')) return 'Church';
  if (nameLower.includes('christmas') || nameLower.includes('carol')) return 'Sparkles';
  if (nameLower.includes('classical')) return 'Music2';
  if (nameLower.includes('jazz')) return 'Music';
  if (nameLower.includes('tour')) return 'MapPin';
  if (nameLower.includes('interview')) return 'Mic';
  if (nameLower.includes('hip hop') || nameLower.includes('mass')) return 'Disc';
  if (nameLower.includes('rehearsal')) return 'Clock';
  if (nameLower.includes('alumni') || nameLower.includes('archive')) return 'Users';
  if (nameLower.includes('exec') || nameLower.includes('board')) return 'Shield';
  if (nameLower.includes('conducting')) return 'Music';
  if (nameLower.includes('sisters')) return 'Heart';
  if (nameLower.includes('special') || nameLower.includes('live')) return 'Star';
  if (nameLower.includes('survey') || nameLower.includes('african')) return 'Globe';
  if (nameLower.includes('serenbe') || nameLower.includes('film')) return 'Film';
  if (nameLower.includes('1973') || nameLower.includes('glee')) return 'Radio';
  if (nameLower.includes('amaze') || nameLower.includes('inspire')) return 'Sparkles';
  
  return 'Radio';
}

function getStationColor(name: string, index: number): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('gospel')) return '#9333ea'; // purple
  if (nameLower.includes('spiritual')) return '#7c3aed'; // violet
  if (nameLower.includes('christmas') || nameLower.includes('carol')) return '#dc2626'; // red
  if (nameLower.includes('classical')) return '#059669'; // emerald
  if (nameLower.includes('jazz')) return '#d97706'; // amber
  if (nameLower.includes('tour')) return '#3b82f6'; // blue
  if (nameLower.includes('interview')) return '#8b5cf6'; // violet
  if (nameLower.includes('hip hop') || nameLower.includes('mass')) return '#ec4899'; // pink
  if (nameLower.includes('rehearsal')) return '#f59e0b'; // yellow
  if (nameLower.includes('alumni') || nameLower.includes('archive')) return '#06b6d4'; // cyan
  if (nameLower.includes('exec') || nameLower.includes('board')) return '#ef4444'; // red
  if (nameLower.includes('sisters')) return '#f472b6'; // pink
  if (nameLower.includes('special') || nameLower.includes('live')) return '#fbbf24'; // amber
  if (nameLower.includes('survey') || nameLower.includes('african')) return '#10b981'; // emerald
  if (nameLower.includes('serenbe') || nameLower.includes('film')) return '#6366f1'; // indigo
  
  // Default colors cycling
  const colors = ['#7BAFD4', '#9333ea', '#059669', '#ea580c', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6'];
  return colors[index % colors.length];
}
