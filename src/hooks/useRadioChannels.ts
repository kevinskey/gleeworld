import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { azuraCastService } from '@/services/azuracast';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [channels, setChannels] = useState<RadioChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<RadioChannel | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Try to fetch AzuraCast playlists first (for authorized users)
        if (user) {
          try {
            const playlists = await azuraCastService.getPlaylists();
            console.log('AzuraCast playlists fetched:', playlists);
            
            if (Array.isArray(playlists) && playlists.length > 0) {
              // Convert AzuraCast playlists to RadioChannel format
              const playlistChannels: RadioChannel[] = playlists
                .filter((p: any) => p.is_enabled !== false)
                .map((playlist: any, index: number) => ({
                  id: `azura-${playlist.id}`,
                  name: playlist.name,
                  description: playlist.description || `${playlist.type || 'default'} playlist`,
                  // Main stream URL - all playlists play through the main stream
                  stream_url: 'https://radio.gleeworld.org/listen/glee_world_radio/radio.mp3',
                  icon: getPlaylistIcon(playlist.name, playlist.type),
                  color: getPlaylistColor(playlist.name, index),
                  sort_order: playlist.weight || index,
                  is_active: playlist.is_enabled !== false,
                  is_default: index === 0,
                  azura_playlist_id: playlist.id,
                  type: playlist.type,
                }));

              setChannels(playlistChannels);
              
              // Set default channel
              const savedChannelId = localStorage.getItem('gleeworld-radio-channel');
              const savedChannel = savedChannelId 
                ? playlistChannels.find(c => c.id === savedChannelId)
                : null;
              
              if (savedChannel) {
                setSelectedChannel(savedChannel);
              } else if (playlistChannels.length > 0) {
                setSelectedChannel(playlistChannels[0]);
              }
              
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.log('Could not fetch AzuraCast playlists, falling back to static channels:', error);
          }
        }

        // Fallback: fetch from static database channels
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
  }, [user]);

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

// Helper functions to assign icons and colors based on playlist name/type
function getPlaylistIcon(name: string, type?: string): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('gospel') || nameLower.includes('spiritual')) return 'Church';
  if (nameLower.includes('christmas') || nameLower.includes('carol')) return 'Sparkles';
  if (nameLower.includes('classical')) return 'Music2';
  if (nameLower.includes('jazz')) return 'Music';
  if (nameLower.includes('jingle')) return 'Bell';
  if (nameLower.includes('tour')) return 'MapPin';
  if (nameLower.includes('podcast')) return 'Mic';
  if (nameLower.includes('hip hop') || nameLower.includes('hiphop')) return 'Disc';
  
  if (type === 'jingle_mode') return 'Bell';
  if (type === 'scheduled') return 'Clock';
  
  return 'Radio';
}

function getPlaylistColor(name: string, index: number): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('gospel') || nameLower.includes('spiritual')) return '#9333ea'; // purple
  if (nameLower.includes('christmas') || nameLower.includes('carol')) return '#dc2626'; // red
  if (nameLower.includes('classical')) return '#059669'; // emerald
  if (nameLower.includes('jazz')) return '#d97706'; // amber
  if (nameLower.includes('jingle')) return '#f59e0b'; // yellow
  if (nameLower.includes('tour')) return '#3b82f6'; // blue
  if (nameLower.includes('podcast')) return '#8b5cf6'; // violet
  if (nameLower.includes('hip hop') || nameLower.includes('hiphop')) return '#ec4899'; // pink
  
  // Default colors cycling
  const colors = ['#7BAFD4', '#9333ea', '#059669', '#ea580c', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6'];
  return colors[index % colors.length];
}
