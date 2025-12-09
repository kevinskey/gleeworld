import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface OnlineUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  joined_at: string;
}

interface PresenceState {
  [key: string]: OnlineUser[];
}

export function useGleeLoungePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const syncPresenceState = useCallback((state: PresenceState) => {
    const users: OnlineUser[] = [];
    Object.values(state).forEach((presences) => {
      presences.forEach((presence) => {
        if (!users.find(u => u.user_id === presence.user_id)) {
          users.push(presence);
        }
      });
    });
    setOnlineUsers(users);
  }, []);

  useEffect(() => {
    let presenceChannel: RealtimeChannel | null = null;

    const setupPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile for presence data
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      const presenceData: OnlineUser = {
        user_id: user.id,
        full_name: profile?.full_name || 'Member',
        avatar_url: profile?.avatar_url || null,
        joined_at: new Date().toISOString(),
      };

      presenceChannel = supabase.channel('glee-lounge-presence', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel?.presenceState() as PresenceState;
          if (state) {
            syncPresenceState(state);
          }
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('User joined:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('User left:', leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel?.track(presenceData);
            setIsConnected(true);
          }
        });

      setChannel(presenceChannel);
    };

    setupPresence();

    return () => {
      if (presenceChannel) {
        presenceChannel.unsubscribe();
      }
    };
  }, [syncPresenceState]);

  return { onlineUsers, isConnected, channel };
}
