import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export interface DMConversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  unread_count: number;
}

export const useDirectMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, DMMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});

  // Fetch all conversations
  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data: convos, error } = await supabase
        .from('dm_conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for other participants
      const otherUserIds = convos?.map(c => 
        c.participant_1 === user.id ? c.participant_2 : c.participant_1
      ) || [];

      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch unread counts
      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (convo) => {
          const otherUserId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
          const profile = profileMap.get(otherUserId);

          // Count unread messages
          const { count } = await supabase
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convo.id)
            .eq('read', false)
            .neq('sender_id', user.id);

          return {
            ...convo,
            other_user_id: otherUserId,
            other_user_name: profile?.full_name || 'Unknown User',
            other_user_avatar: profile?.avatar_url,
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId: string, limit = 50) => {
    if (!user) return;

    try {
      const { data: msgs, error } = await supabase
        .from('dm_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Check if there are more messages
      setHasMore(prev => ({ ...prev, [conversationId]: (msgs?.length || 0) === limit }));

      // Fetch sender profiles
      const senderIds = [...new Set(msgs?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedMessages = msgs?.map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id)?.full_name || 'Unknown',
        sender_avatar: profileMap.get(msg.sender_id)?.avatar_url
      })) || [];

      // Reverse to show oldest first
      setMessages(prev => ({ ...prev, [conversationId]: enrichedMessages.reverse() }));

      // Mark messages as read
      const { error: markReadError } = await supabase
        .from('dm_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

      if (markReadError) {
        console.error('Error marking messages as read:', markReadError);
      }

      // Refresh conversations to update unread count
      await fetchConversations();

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  // Load more messages (infinite scroll)
  const loadMoreMessages = async (conversationId: string) => {
    if (!user || loadingMore || !hasMore[conversationId]) return;

    setLoadingMore(true);
    try {
      const currentMessages = messages[conversationId] || [];
      const oldestMessage = currentMessages[0];
      
      if (!oldestMessage) {
        setLoadingMore(false);
        return;
      }

      const { data: msgs, error } = await supabase
        .from('dm_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Check if there are more messages
      setHasMore(prev => ({ ...prev, [conversationId]: (msgs?.length || 0) === 50 }));

      // Fetch sender profiles
      const senderIds = [...new Set(msgs?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedMessages = msgs?.map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id)?.full_name || 'Unknown',
        sender_avatar: profileMap.get(msg.sender_id)?.avatar_url
      })) || [];

      // Prepend older messages (reverse to show oldest first)
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...enrichedMessages.reverse(), ...currentMessages]
      }));

    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  };

  // Send a message
  const sendMessage = async (conversationId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim()
        });

      if (error) throw error;

      console.log('📨 DM sent, checking for SMS notifications...');

      // Get sender's phone number for confirmation SMS
      const { data: senderProfile } = await supabase
        .from('gw_profiles')
        .select('phone_number')
        .eq('user_id', user.id)
        .single();

      console.log('👤 Sender profile:', senderProfile);

      // Send SMS confirmation to sender (you)
      if (senderProfile?.phone_number) {
        console.log('📱 Sending SMS to sender:', senderProfile.phone_number);
        try {
          const smsResult = await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: senderProfile.phone_number,
              message: `[GleeWorld] You sent: "${content.substring(0, 90)}${content.length > 90 ? '...' : ''}"`
            }
          });
          console.log('✅ SMS sent to sender:', smsResult);
        } catch (smsError) {
          console.error('❌ Failed to send SMS to sender:', smsError);
        }
      } else {
        console.log('⚠️ No phone number for sender');
      }

      // Get recipient ID
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        console.log('👥 Conversation found:', conversation);
        
        // Send push notification via edge function
        await supabase.functions.invoke('send-push-notification', {
          body: {
            recipientId: conversation.other_user_id,
            title: 'New Direct Message',
            body: `${user.user_metadata?.full_name || 'Someone'}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            data: {
              type: 'dm',
              conversationId,
              senderId: user.id,
            }
          }
        }).catch(err => console.error('Failed to send push notification:', err));

        // Send SMS notification to recipient
        try {
          const { data: recipientProfile } = await supabase
            .from('gw_profiles')
            .select('phone_number')
            .eq('user_id', conversation.other_user_id)
            .single();

          console.log('📞 Recipient profile:', recipientProfile);

          if (recipientProfile?.phone_number) {
            console.log('📱 Sending SMS to recipient:', recipientProfile.phone_number);
            const recipientSmsResult = await supabase.functions.invoke('gw-send-sms', {
              body: {
                to: recipientProfile.phone_number,
                message: `[GleeWorld] ${user.user_metadata?.full_name || 'Someone'}: ${content.substring(0, 90)}${content.length > 90 ? '...' : ''}`
              }
            });
            console.log('✅ SMS sent to recipient:', recipientSmsResult);
          } else {
            console.log('⚠️ No phone number for recipient');
          }
        } catch (smsError) {
          console.error('❌ Failed to send SMS to recipient:', smsError);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  // Create or get conversation with a user
  const createConversation = async (otherUserId: string) => {
    console.log('🔵 createConversation called with otherUserId:', otherUserId);
    if (!user) {
      console.log('🔵 createConversation: No user, returning null');
      return null;
    }

    try {
      // Order participants consistently
      const [p1, p2] = [user.id, otherUserId].sort();
      console.log('🔵 createConversation: Participants sorted:', { p1, p2, currentUser: user.id, otherUser: otherUserId });

      // Check if conversation exists
      const { data: existing, error: fetchError } = await supabase
        .from('dm_conversations')
        .select('*')
        .eq('participant_1', p1)
        .eq('participant_2', p2)
        .single();

      console.log('🔵 createConversation: Check existing result:', { existing, fetchError });

      if (existing) {
        console.log('🔵 createConversation: Returning existing conversation:', existing.id);
        return existing.id;
      }

      // Create new conversation
      console.log('🔵 createConversation: Creating new conversation...');
      const { data: newConvo, error: createError } = await supabase
        .from('dm_conversations')
        .insert({ participant_1: p1, participant_2: p2 })
        .select()
        .single();

      console.log('🔵 createConversation: Insert result:', { newConvo, createError });

      if (createError) throw createError;

      await fetchConversations();
      console.log('🔵 createConversation: Returning new conversation:', newConvo.id);
      return newConvo.id;
    } catch (error) {
      console.error('🔴 Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Use consistent channel name - one per user
    const channelName = `dm-updates-${user.id}`;
    
    // Remove any existing channel with this name first
    supabase.removeAllChannels();
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', newMessage.sender_id)
            .single();

          const enrichedMessage: DMMessage = {
            ...newMessage,
            sender_name: profile?.full_name || 'Unknown',
            sender_avatar: profile?.avatar_url
          };

          setMessages(prev => ({
            ...prev,
            [newMessage.conversation_id]: [
              ...(prev[newMessage.conversation_id] || []),
              enrichedMessage
            ]
          }));

          // Refresh conversations to update last message time and unread count
          await fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dm_messages'
        },
        async () => {
          // When messages are marked as read, refresh conversations
          await fetchConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    conversations,
    messages,
    loading,
    loadingMore,
    hasMore,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    createConversation,
  };
};
