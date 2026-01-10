import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ActiveMeetingParticipant {
  user_id: string;
  user_name: string;
  user_email?: string;
  joined_at: string;
}

export interface ActiveMeeting {
  room_name: string;
  participants: ActiveMeetingParticipant[];
}

// Global presence channel for all video meetings
const PRESENCE_CHANNEL = 'active-video-meetings';

export const useActiveMeetings = () => {
  const [activeMeetings, setActiveMeetings] = useState<ActiveMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const presenceChannel = supabase.channel(PRESENCE_CHANNEL);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const meetings = parsePresenceState(state);
        setActiveMeetings(meetings);
        setIsLoading(false);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined meeting:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left meeting:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to active meetings presence');
          setIsLoading(false);
        }
      });

    setChannel(presenceChannel);

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  // Parse presence state into active meetings format
  const parsePresenceState = (state: Record<string, any[]>): ActiveMeeting[] => {
    const meetingsMap = new Map<string, ActiveMeetingParticipant[]>();

    // State is keyed by unique presence key (we'll use `${room_name}:${user_id}`)
    Object.entries(state).forEach(([key, presences]) => {
      presences.forEach((presence: any) => {
        const roomName = presence.room_name;
        if (!roomName) return;

        if (!meetingsMap.has(roomName)) {
          meetingsMap.set(roomName, []);
        }

        meetingsMap.get(roomName)!.push({
          user_id: presence.user_id,
          user_name: presence.user_name,
          user_email: presence.user_email,
          joined_at: presence.joined_at,
        });
      });
    });

    return Array.from(meetingsMap.entries()).map(([room_name, participants]) => ({
      room_name,
      participants,
    }));
  };

  return {
    activeMeetings,
    isLoading,
    channel,
  };
};

// Hook for tracking current user's presence in a meeting
export const useMeetingPresence = (
  roomName: string | null,
  userName: string,
  userEmail?: string,
  userId?: string
) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomName || !userId) return;

    const presenceChannel = supabase.channel(PRESENCE_CHANNEL);

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track this user's presence in the room
        await presenceChannel.track({
          room_name: roomName,
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          joined_at: new Date().toISOString(),
        });
        console.log('Tracking presence for room:', roomName);
      }
    });

    setChannel(presenceChannel);

    return () => {
      // Untrack removes this user's presence
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [roomName, userName, userEmail, userId]);

  return { channel };
};
