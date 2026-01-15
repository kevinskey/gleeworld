import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

// IMPORTANT: Supabase will close earlier channels if multiple are created with the same topic.
// We keep a singleton presence channel (per user key) shared by both the list and meeting tracking.
let singletonChannel: RealtimeChannel | null = null;
let singletonKey: string | null = null;
let singletonSubscribed = false;
let singletonSubscribePromise: Promise<void> | null = null;

const getPresenceChannel = (presenceKey: string) => {
  if (singletonChannel && singletonKey === presenceKey) {
    return singletonChannel;
  }

  // Clean up previous channel (different user)
  if (singletonChannel) {
    try {
      supabase.removeChannel(singletonChannel);
    } catch (e) {
      // ignore
    }
  }

  singletonKey = presenceKey;
  singletonSubscribed = false;
  singletonSubscribePromise = null;

  singletonChannel = supabase.channel(PRESENCE_CHANNEL, {
    config: {
      presence: { key: presenceKey },
    },
  });

  return singletonChannel;
};

export const useActiveMeetings = () => {
  const { user } = useAuth();
  const [activeMeetings, setActiveMeetings] = useState<ActiveMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const presenceKey = user?.id || `viewer-${Math.random().toString(36).slice(2)}`;
    const presenceChannel = getPresenceChannel(presenceKey);

    // Attach handlers once per channel instance
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setActiveMeetings(parsePresenceState(state));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined meeting:', key, newPresences);
        const state = presenceChannel.presenceState();
        setActiveMeetings(parsePresenceState(state));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left meeting:', key, leftPresences);
        const state = presenceChannel.presenceState();
        setActiveMeetings(parsePresenceState(state));
      });

    // Subscribe once (avoid multiple .subscribe() on same topic)
    if (!singletonSubscribePromise) {
      singletonSubscribePromise = new Promise<void>((resolve) => {
        presenceChannel.subscribe(async (status) => {
          console.log('Presence channel status:', status);

          if (status === 'SUBSCRIBED') {
            singletonSubscribed = true;
            setError(null);
            setIsLoading(false);

            // Presence sync/join events are more reliable after the client tracks a presence state.
            try {
              await presenceChannel.track({
                room_name: '',
                user_id: presenceKey,
                user_name: user?.email || 'Viewer',
                user_email: user?.email,
                joined_at: new Date().toISOString(),
                kind: 'lobby',
              });
              console.log('Tracked lobby presence');
            } catch (e) {
              console.warn('Failed to track lobby presence:', e);
            }

            // Immediate refresh after subscribe/track
            setActiveMeetings(parsePresenceState(presenceChannel.presenceState()));
            resolve();
            return;
          }

          if (status === 'CLOSED') {
            setError('Realtime connection closed.');
            setIsLoading(false);
            resolve();
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setError('Realtime connection failed.');
            setIsLoading(false);
            resolve();
          }
        });
      });
    } else {
      // Channel already exists and subscribed - immediately set state from current presence
      setIsLoading(false);
      setActiveMeetings(parsePresenceState(presenceChannel.presenceState()));
    }

    setChannel(presenceChannel);

    // Fallback poll: some environments drop presence events; this keeps UI in sync.
    const poll = window.setInterval(() => {
      try {
        const state = presenceChannel.presenceState();
        setActiveMeetings(parsePresenceState(state));
      } catch {
        // ignore
      }
    }, 2000);

    return () => {
      window.clearInterval(poll);
    };
  }, [user?.id]);

  // Parse presence state into active meetings format
  const parsePresenceState = (state: Record<string, any[]>): ActiveMeeting[] => {
    const meetingsMap = new Map<string, ActiveMeetingParticipant[]>();

    console.log('[ActiveMeetings] Parsing presence state:', JSON.stringify(state, null, 2));

    Object.values(state).forEach((presences) => {
      presences.forEach((presence: any) => {
        const roomName = presence.room_name;
        // Filter out lobby entries (empty room_name or kind === 'lobby')
        if (!roomName || presence.kind === 'lobby') return;

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

    const meetings = Array.from(meetingsMap.entries()).map(([room_name, participants]) => ({
      room_name,
      participants,
    }));
    
    console.log('[ActiveMeetings] Parsed meetings:', meetings.length, meetings.map(m => m.room_name));
    return meetings;
  };

  return {
    activeMeetings,
    isLoading,
    error,
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

    console.log('[Presence] meeting hook mount', { roomName, userId });

    const presenceChannel = getPresenceChannel(userId);
    let interval: number | null = null;

    const doTrack = async () => {
      try {
        if (singletonSubscribePromise) {
          await singletonSubscribePromise;
        }

        // If no one mounted the list yet, subscribe here.
        if (!singletonSubscribed) {
          await new Promise<void>((resolve) => {
            presenceChannel.subscribe((status) => {
              console.log('Meeting presence channel status:', status);
              if (status === 'SUBSCRIBED') {
                singletonSubscribed = true;
                resolve();
              }
              if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                resolve();
              }
            });
          });
        }

        await presenceChannel.track({
          room_name: roomName,
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          joined_at: new Date().toISOString(),
          kind: 'meeting',
        });

        console.log('[Presence] tracked meeting', roomName);
      } catch (e) {
        console.error('Failed to track meeting presence:', e);
      }
    };

    // Track immediately + refresh periodically (keeps state live in flaky networks)
    void doTrack();
    interval = window.setInterval(() => void doTrack(), 5000);

    setChannel(presenceChannel);

    return () => {
      console.log('[Presence] meeting hook cleanup', { roomName, userId });
      if (interval) window.clearInterval(interval);
      presenceChannel.untrack();
    };
  }, [roomName, userName, userEmail, userId]);

  return { channel };
};
