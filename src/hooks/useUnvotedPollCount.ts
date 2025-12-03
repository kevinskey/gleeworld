import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnvotedPollCount = (groupId: string) => {
  const { user } = useAuth();
  const [unvotedCount, setUnvotedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !groupId) {
      setLoading(false);
      return;
    }

    const fetchUnvotedCount = async () => {
      try {
        // Get poll messages for this group from gw_group_messages
        const { data: pollMessages, error: messagesError } = await supabase
          .from('gw_group_messages')
          .select('id')
          .eq('group_id', groupId)
          .eq('message_type', 'poll');
        
        if (messagesError) throw messagesError;

        if (!pollMessages || pollMessages.length === 0) {
          setUnvotedCount(0);
          setLoading(false);
          return;
        }

        const messageIds = pollMessages.map(m => m.id);

        // Get polls linked to these messages
        const { data: polls, error: pollsError } = await supabase
          .from('gw_polls')
          .select('id, is_closed, expires_at, message_id')
          .in('message_id', messageIds)
          .eq('is_closed', false);
        
        if (pollsError) throw pollsError;

        if (!polls || polls.length === 0) {
          setUnvotedCount(0);
          setLoading(false);
          return;
        }

        // Filter out expired polls
        const now = new Date();
        const activePolls = polls.filter((poll: any) => {
          if (!poll.expires_at) return true;
          return new Date(poll.expires_at) > now;
        });

        if (activePolls.length === 0) {
          setUnvotedCount(0);
          setLoading(false);
          return;
        }

        // Get user's votes for these polls
        const pollIds = activePolls.map((p: any) => p.id);
        const { data: votes, error: votesError } = await supabase
          .from('gw_poll_votes')
          .select('poll_id')
          .eq('user_id', user.id)
          .in('poll_id', pollIds);

        if (votesError) throw votesError;

        const votesList = votes || [];
        // Calculate unvoted count
        const votedPollIds = new Set(votesList.map((v: any) => v.poll_id));
        const unvoted = activePolls.filter((poll: any) => !votedPollIds.has(poll.id));
        setUnvotedCount(unvoted.length);
      } catch (error) {
        console.error('Error fetching unvoted poll count:', error);
        setUnvotedCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnvotedCount();

    // Subscribe to poll message changes
    const pollChannel = supabase
      .channel(`poll-messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_group_messages',
          filter: `group_id=eq.${groupId}`
        },
        () => fetchUnvotedCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_poll_votes',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchUnvotedCount()
      )
      .subscribe();

    return () => {
      pollChannel.unsubscribe();
    };
  }, [user, groupId]);

  return { unvotedCount, loading };
};
