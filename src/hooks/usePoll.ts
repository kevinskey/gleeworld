import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PollOption {
  id: string;
  option_text: string;
  display_order: number;
  vote_count?: number;
  has_user_voted?: boolean;
}

export interface Poll {
  id: string;
  message_id: string;
  question: string;
  created_by: string;
  expires_at: string | null;
  allow_multiple_selections: boolean;
  is_anonymous: boolean;
  is_closed: boolean;
  created_at: string;
  options: PollOption[];
  total_votes: number;
  user_has_voted: boolean;
}

export const usePoll = (messageId?: string) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (messageId) {
      fetchPoll(messageId);
    }
  }, [messageId]);

  const fetchPoll = async (msgId: string) => {
    try {
      setLoading(true);

      // Fetch poll
      const { data: pollData, error: pollError } = await supabase
        .from('gw_polls')
        .select('*')
        .eq('message_id', msgId)
        .single();

      if (pollError) throw pollError;
      if (!pollData) return;

      // Fetch options
      const { data: optionsData, error: optionsError } = await supabase
        .from('gw_poll_options')
        .select('*')
        .eq('poll_id', pollData.id)
        .order('display_order');

      if (optionsError) throw optionsError;

      // Fetch votes
      const { data: votesData, error: votesError } = await supabase
        .from('gw_poll_votes')
        .select('option_id, user_id')
        .eq('poll_id', pollData.id);

      if (votesError) throw votesError;

      // Calculate vote counts and check if user voted
      const options: PollOption[] = optionsData.map(opt => {
        const votes = votesData.filter(v => v.option_id === opt.id);
        return {
          id: opt.id,
          option_text: opt.option_text,
          display_order: opt.display_order,
          vote_count: votes.length,
          has_user_voted: votes.some(v => v.user_id === user?.id)
        };
      });

      setPoll({
        ...pollData,
        options,
        total_votes: votesData.length,
        user_has_voted: votesData.some(v => v.user_id === user?.id)
      });
    } catch (error) {
      console.error('Error fetching poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPoll = async (
    groupId: string,
    question: string,
    options: string[],
    settings: {
      allowMultiple?: boolean;
      isAnonymous?: boolean;
      expiresInHours?: number;
    } = {}
  ) => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Get user's profile for the notification
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Create message first
      const { data: messageData, error: messageError } = await supabase
        .from('gw_group_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: question,
          message_type: 'poll'
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Create poll
      const expiresAt = settings.expiresInHours
        ? new Date(Date.now() + settings.expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

      const { data: pollData, error: pollError } = await supabase
        .from('gw_polls')
        .insert({
          message_id: messageData.id,
          question,
          created_by: user.id,
          allow_multiple_selections: settings.allowMultiple || false,
          is_anonymous: settings.isAnonymous || false,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create options
      const { error: optionsError } = await supabase
        .from('gw_poll_options')
        .insert(
          options.map((opt, idx) => ({
            poll_id: pollData.id,
            option_text: opt,
            display_order: idx
          }))
        );

      if (optionsError) throw optionsError;

      // Send SMS notifications to group members (non-blocking)
      supabase.functions.invoke('send-poll-notification', {
        body: {
          groupId,
          pollQuestion: question,
          creatorUserId: user.id,
          creatorName: profile?.full_name || 'A member'
        }
      }).then(({ error }) => {
        if (error) {
          console.error('Failed to send poll SMS notifications:', error);
        } else {
          console.log('Poll SMS notifications sent');
        }
      });

      return messageData.id;
    } catch (error) {
      console.error('Error creating poll:', error);
      throw error;
    }
  };

  const vote = async (pollId: string, optionIds: string[]) => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Check if poll allows multiple selections
      const currentPoll = poll || (await fetchPollById(pollId));
      if (!currentPoll) throw new Error('Poll not found');

      if (!currentPoll.allow_multiple_selections && optionIds.length > 1) {
        throw new Error('This poll only allows one selection');
      }

      // Delete existing votes if changing vote
      await supabase
        .from('gw_poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id);

      // Insert new votes
      const { error } = await supabase
        .from('gw_poll_votes')
        .insert(
          optionIds.map(optionId => ({
            poll_id: pollId,
            option_id: optionId,
            user_id: user.id
          }))
        );

      if (error) throw error;

      // Refresh poll data
      if (messageId) {
        await fetchPoll(messageId);
      }
    } catch (error) {
      console.error('Error voting on poll:', error);
      throw error;
    }
  };

  const fetchPollById = async (pollId: string): Promise<Poll | null> => {
    const { data, error } = await supabase
      .from('gw_polls')
      .select('*')
      .eq('id', pollId)
      .single();

    if (error || !data) return null;

    // Simplified return, full implementation would fetch options too
    return data as any;
  };

  const closePoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('gw_polls')
        .update({ is_closed: true })
        .eq('id', pollId);

      if (error) throw error;

      if (messageId) {
        await fetchPoll(messageId);
      }
    } catch (error) {
      console.error('Error closing poll:', error);
      throw error;
    }
  };

  return {
    poll,
    loading,
    createPoll,
    vote,
    closePoll,
    refetch: () => messageId && fetchPoll(messageId)
  };
};
