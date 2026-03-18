import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { uploadFileAndGetUrl } from '@/utils/storage';

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
  message_type?: 'text' | 'image' | 'file' | 'audio';
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
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

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data: convos, error } = await supabase
        .from('dm_conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const otherUserIds = convos?.map((conversation) =>
        conversation.participant_1 === user.id ? conversation.participant_2 : conversation.participant_1,
      ) || [];

      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds);

      const profileMap = new Map(profiles?.map((profile) => [profile.user_id, profile]) || []);

      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (conversation) => {
          const otherUserId = conversation.participant_1 === user.id ? conversation.participant_2 : conversation.participant_1;
          const profile = profileMap.get(otherUserId);

          const { count } = await supabase
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id)
            .eq('read', false)
            .neq('sender_id', user.id);

          return {
            ...conversation,
            other_user_id: otherUserId,
            other_user_name: profile?.full_name || 'Unknown User',
            other_user_avatar: profile?.avatar_url,
            unread_count: count || 0,
          };
        }),
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

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

      setHasMore((prev) => ({ ...prev, [conversationId]: (msgs?.length || 0) === limit }));

      const senderIds = [...new Set(msgs?.map((message) => message.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map((profile) => [profile.user_id, profile]) || []);

      const enrichedMessages = msgs?.map((message) => ({
        ...message,
        sender_name: profileMap.get(message.sender_id)?.full_name || 'Unknown',
        sender_avatar: profileMap.get(message.sender_id)?.avatar_url,
      })) || [];

      setMessages((prev) => ({ ...prev, [conversationId]: enrichedMessages.reverse() }));

      const { error: markReadError } = await supabase
        .from('dm_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

      if (markReadError) {
        console.error('Error marking messages as read:', markReadError);
      }

      await fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

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

      setHasMore((prev) => ({ ...prev, [conversationId]: (msgs?.length || 0) === 50 }));

      const senderIds = [...new Set(msgs?.map((message) => message.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map((profile) => [profile.user_id, profile]) || []);

      const enrichedMessages = msgs?.map((message) => ({
        ...message,
        sender_name: profileMap.get(message.sender_id)?.full_name || 'Unknown',
        sender_avatar: profileMap.get(message.sender_id)?.avatar_url,
      })) || [];

      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...enrichedMessages.reverse(), ...currentMessages],
      }));
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string, file?: File) => {
    const trimmedContent = content.trim();
    if (!user || (!trimmedContent && !file)) return;

    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      let messageType: 'text' | 'image' | 'file' | 'audio' = 'text';

      if (file) {
        const uploadResult = await uploadFileAndGetUrl(file, 'message-attachments', `messages/${conversationId}`);
        if (!uploadResult) {
          throw new Error('Failed to upload attachment');
        }

        fileUrl = uploadResult.url;
        fileName = file.name;
        fileSize = file.size;
        messageType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file';
      }

      const storedContent = trimmedContent || fileName || 'Attachment';
      const previewText = trimmedContent || (file ? `${messageType === 'audio' ? 'Audio' : 'File'} attachment: ${file.name}` : 'New message');

      const { error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: storedContent,
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
        });

      if (error) throw error;

      const { data: senderProfile } = await supabase
        .from('gw_profiles')
        .select('phone_number')
        .eq('user_id', user.id)
        .single();

      if (senderProfile?.phone_number) {
        try {
          await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: senderProfile.phone_number,
              message: `[GleeWorld] You sent: "${previewText.substring(0, 90)}${previewText.length > 90 ? '...' : ''}"`,
              mediaUrl: fileUrl,
            },
          });
        } catch (smsError) {
          console.error('❌ Failed to send SMS to sender:', smsError);
        }
      }

      const conversation = conversations.find((item) => item.id === conversationId);
      if (conversation) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            recipientId: conversation.other_user_id,
            title: 'New Direct Message',
            body: `${user.user_metadata?.full_name || 'Someone'}: ${previewText.substring(0, 50)}${previewText.length > 50 ? '...' : ''}`,
            data: {
              type: 'dm',
              conversationId,
              senderId: user.id,
            },
          },
        }).catch((err) => console.error('Failed to send push notification:', err));

        try {
          const { data: recipientProfile } = await supabase
            .from('gw_profiles')
            .select('phone_number')
            .eq('user_id', conversation.other_user_id)
            .single();

          if (recipientProfile?.phone_number) {
            await supabase.functions.invoke('gw-send-sms', {
              body: {
                to: recipientProfile.phone_number,
                message: `[GleeWorld] ${user.user_metadata?.full_name || 'Someone'}: ${previewText.substring(0, 90)}${previewText.length > 90 ? '...' : ''}`,
                mediaUrl: fileUrl,
              },
            });
          }
        } catch (smsError) {
          console.error('❌ Failed to send SMS to recipient:', smsError);
        }
      }

      await fetchMessages(conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  const createConversation = async (otherUserId: string) => {
    if (!user) return null;

    try {
      const [p1, p2] = [user.id, otherUserId].sort();

      const { data: existing } = await supabase
        .from('dm_conversations')
        .select('*')
        .eq('participant_1', p1)
        .eq('participant_2', p2)
        .single();

      if (existing) return existing.id;

      const { data: newConvo, error: createError } = await supabase
        .from('dm_conversations')
        .insert({ participant_1: p1, participant_2: p2 })
        .select()
        .single();

      if (createError) throw createError;

      await fetchConversations();
      return newConvo.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  };

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchConversations();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `dm-updates-${user.id}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
        },
        async (payload) => {
          const newMessage = payload.new as DMMessage;

          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', newMessage.sender_id)
            .single();

          const enrichedMessage: DMMessage = {
            ...newMessage,
            sender_name: profile?.full_name || 'Unknown',
            sender_avatar: profile?.avatar_url,
          };

          setMessages((prev) => {
            const existingMessages = prev[newMessage.conversation_id] || [];
            if (existingMessages.some((message) => message.id === newMessage.id)) {
              return prev;
            }

            return {
              ...prev,
              [newMessage.conversation_id]: [...existingMessages, enrichedMessage],
            };
          });

          await fetchConversations();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dm_messages',
        },
        async () => {
          await fetchConversations();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
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
