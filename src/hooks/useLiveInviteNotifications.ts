import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveInvite {
  id: string;
  session_host_id: string;
  session_host_name: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function useLiveInviteNotifications() {
  const [pendingInvites, setPendingInvites] = useState<LiveInvite[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch pending invites on mount
  useEffect(() => {
    if (!userId) return;

    const fetchPendingInvites = async () => {
      const { data } = await supabase
        .from('gw_live_session_invites')
        .select('*')
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (data) {
        setPendingInvites(data as LiveInvite[]);
      }
    };

    fetchPendingInvites();
  }, [userId]);

  // Listen for new invites in real-time
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('live-invite-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_live_session_invites',
          filter: `invited_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New live invite received:', payload);
          const newInvite = payload.new as LiveInvite;
          setPendingInvites(prev => [...prev, newInvite]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gw_live_session_invites',
          filter: `invited_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Invite updated:', payload);
          const updated = payload.new as LiveInvite;
          if (updated.status !== 'pending') {
            setPendingInvites(prev => prev.filter(i => i.id !== updated.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'gw_live_session_invites',
        },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setPendingInvites(prev => prev.filter(i => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismissInvite = async (inviteId: string) => {
    await supabase
      .from('gw_live_session_invites')
      .update({ status: 'dismissed' })
      .eq('id', inviteId);
    
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
  };

  const acceptInvite = async (inviteId: string) => {
    await supabase
      .from('gw_live_session_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId);
    
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
  };

  return {
    pendingInvites,
    dismissInvite,
    acceptInvite,
  };
}
