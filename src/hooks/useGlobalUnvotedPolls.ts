import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnvotedPoll {
  id: string;
  question: string;
  group_id: string;
  group_name: string;
  expires_at: string | null;
}

export const useGlobalUnvotedPolls = () => {
  const { user } = useAuth();
  const [unvotedPolls, setUnvotedPolls] = useState<UnvotedPoll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchUnvotedPolls = async () => {
      try {
        // Get all groups user is a member of
        const { data: memberGroups, error: groupsError } = await supabase
          .from('gw_group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (groupsError) throw groupsError;
        if (!memberGroups || memberGroups.length === 0) {
          setUnvotedPolls([]);
          setLoading(false);
          return;
        }

        const groupIds = memberGroups.map(g => g.group_id);

        // Get group names
        const { data: groups } = await supabase
          .from('gw_groups')
          .select('id, name')
          .in('id', groupIds);

        const groupNameMap = new Map(groups?.map(g => [g.id, g.name]) || []);

        // Get poll messages for these groups
        const { data: pollMessages, error: messagesError } = await supabase
          .from('gw_group_messages')
          .select('id, group_id')
          .in('group_id', groupIds)
          .eq('message_type', 'poll');

        if (messagesError) throw messagesError;
        if (!pollMessages || pollMessages.length === 0) {
          setUnvotedPolls([]);
          setLoading(false);
          return;
        }

        const messageIds = pollMessages.map(m => m.id);
        const messageGroupMap = new Map(pollMessages.map(m => [m.id, m.group_id]));

        // Get active polls
        const { data: polls, error: pollsError } = await supabase
          .from('gw_polls')
          .select('id, question, message_id, expires_at, is_closed')
          .in('message_id', messageIds)
          .eq('is_closed', false);

        if (pollsError) throw pollsError;
        if (!polls || polls.length === 0) {
          setUnvotedPolls([]);
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
          setUnvotedPolls([]);
          setLoading(false);
          return;
        }

        // Get user's votes
        const pollIds = activePolls.map((p: any) => p.id);
        const { data: votes, error: votesError } = await supabase
          .from('gw_poll_votes')
          .select('poll_id')
          .eq('user_id', user.id)
          .in('poll_id', pollIds);

        if (votesError) throw votesError;

        const votedPollIds = new Set((votes || []).map((v: any) => v.poll_id));
        
        // Get unvoted polls with details
        const unvoted = activePolls
          .filter((poll: any) => !votedPollIds.has(poll.id))
          .map((poll: any) => {
            const groupId = messageGroupMap.get(poll.message_id) || '';
            return {
              id: poll.id,
              question: poll.question,
              group_id: groupId,
              group_name: groupNameMap.get(groupId) || 'Unknown Group',
              expires_at: poll.expires_at
            };
          });

        setUnvotedPolls(unvoted);
      } catch (error) {
        console.error('Error fetching global unvoted polls:', error);
        setUnvotedPolls([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnvotedPolls();

    // Subscribe to poll changes
    const channel = supabase
      .channel('global-polls')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gw_polls' },
        () => fetchUnvotedPolls()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gw_poll_votes', filter: `user_id=eq.${user.id}` },
        () => fetchUnvotedPolls()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return { unvotedPolls, loading, hasUnvotedPolls: unvotedPolls.length > 0 };
};
