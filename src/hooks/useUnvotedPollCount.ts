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
        // Get all active polls for this group
        const { data: polls, error: pollsError } = await (supabase as any)
          .from('gw_polls')
          .select('id, is_closed, expires_at')
          .eq('group_id', groupId)
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
        const { data: votes, error: votesError } = await (supabase as any)
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

    // Subscribe to poll changes
    const pollChannel = (supabase as any)
      .channel(`polls:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_polls',
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
