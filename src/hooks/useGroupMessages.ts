import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  conversation_id: string;
  sender_phone?: string;
  sender_user_id?: string;
  sender_name?: string;
  message_body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
}

interface Conversation {
  id: string;
  name: string;
  group_type: string;
  twilio_phone_number: string;
  is_active: boolean;
  last_message?: Message;
  unread_count: number;
}

export const useGroupMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default group conversations based on common Glee Club structure
  const defaultConversations: Conversation[] = [
    {
      id: 'exec-board',
      name: 'Executive Board',
      group_type: 'executive_board',
      twilio_phone_number: '+1234567890',
      is_active: true,
      unread_count: 0
    },
    {
      id: 'section-leaders',
      name: 'Section Leaders',
      group_type: 'section_leaders',
      twilio_phone_number: '+1234567890',
      is_active: true,
      unread_count: 0
    },
    {
      id: 'soprano-1',
      name: 'Soprano 1',
      group_type: 'soprano_1',
      twilio_phone_number: '+1234567890',
      is_active: true,
      unread_count: 0
    },
    {
      id: 'soprano-2',
      name: 'Soprano 2',
      group_type: 'soprano_2',
      twilio_phone_number: '+1234567890',
      is_active: true,
      unread_count: 0
    },
    {
      id: 'alto-1',
      name: 'Alto 1',
      group_type: 'alto_1',
      twilio_phone_number: '+1234567890',
      is_active: true,
      unread_count: 0
    },
    {
      id: 'alto-2',
      name: 'Alto 2',
      group_type: 'alto_2',
      twilio_phone_number: '+1234567890',
      is_active: true,
      unread_count: 0
    },
    {
      id: 'all-members',
      name: 'All Members',
      group_type: 'all_members',
      twilio_phone_number: '+1234567890',
      is_active: true,
      unread_count: 0
    },
    {
      id: 'all-alumnae',
      name: 'All Alumnae',
      group_type: 'all_alumnae',
      twilio_phone_number: '+1234567890',
      is_active: true,
      unread_count: 0
    }
  ];

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // In the future, this would check for actual SMS conversations in the database
      // For now, we'll use the default conversations but check if user has access
      const userProfile = await getUserProfile();
      const accessibleConversations = filterConversationsByAccess(defaultConversations, userProfile);
      
      setConversations(accessibleConversations);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const getUserProfile = async () => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('gw_profiles')
      .select('role, voice_part, is_exec_board, is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();
    
    if (error) throw error;
    return data;
  };

  const filterConversationsByAccess = (conversations: Conversation[], userProfile: any) => {
    if (!userProfile) return [];
    
    // Admins and super admins can see all conversations
    if (userProfile.is_admin || userProfile.is_super_admin) {
      return conversations;
    }
    
    return conversations.filter(conv => {
      switch (conv.group_type) {
        case 'executive_board':
          return userProfile.is_exec_board;
        case 'section_leaders':
          // Section leaders would need a specific flag - for now, include exec board
          return userProfile.is_exec_board;
        case 'soprano_1':
          return userProfile.voice_part === 'S1';
        case 'soprano_2':
          return userProfile.voice_part === 'S2';
        case 'alto_1':
          return userProfile.voice_part === 'A1';
        case 'alto_2':
          return userProfile.voice_part === 'A2';
        case 'all_members':
          return ['member', 'executive', 'staff'].includes(userProfile.role);
        case 'all_alumnae':
          return userProfile.role === 'alumna';
        default:
          return false;
      }
    });
  };

  const fetchMessagesForConversation = async (conversationId: string) => {
    try {
      // Fetch in-app messages from gw_group_messages table
      const { data: groupMessages, error: messagesError } = await supabase
        .from('gw_group_messages')
        .select(`
          *,
          user_profile:user_id (
            full_name,
            first_name,
            phone_number
          )
        `)
        .eq('group_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Transform to Message format
      const conversationMessages: Message[] = (groupMessages || []).map(msg => ({
        id: msg.id,
        conversation_id: conversationId,
        sender_phone: msg.user_profile?.phone_number,
        sender_user_id: msg.user_id,
        sender_name: msg.user_profile?.full_name,
        message_body: msg.content,
        direction: 'outbound' as const,
        status: 'delivered',
        created_at: msg.created_at
      }));
      
      setMessages(prev => ({
        ...prev,
        [conversationId]: conversationMessages
      }));
      
      return conversationMessages;
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
      return [];
    }
  };

  const sendMessage = async (conversationId: string, message: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // First, send as in-app message to gw_group_messages
      const { error: inAppError } = await supabase
        .from('gw_group_messages')
        .insert({
          group_id: conversationId,
          user_id: user.id,
          content: message,
          message_type: 'text'
        });

      if (inAppError) throw inAppError;

      // Try to send via SMS if conversation exists
      try {
        const response = await supabase.functions.invoke('send-group-sms', {
          body: {
            conversationId,
            message,
            senderUserId: user.id,
            senderName: user.user_metadata?.full_name || 'Unknown User'
          }
        });

        if (response.error) {
          console.log('SMS not available for this group:', response.error);
          // Don't throw - in-app message already sent successfully
        }
      } catch (smsErr) {
        console.log('SMS send failed, but in-app message delivered:', smsErr);
        // Don't throw - in-app message already sent successfully
      }

      // Refresh messages for this conversation
      await fetchMessagesForConversation(conversationId);
      
      return { success: true };
    } catch (err: any) {
      console.error('Error sending message:', err);
      throw err;
    }
  };
  const markConversationAsRead = async (conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unread_count: 0 }
          : conv
      )
    );
  };

  return {
    conversations,
    messages,
    loading,
    error,
    fetchMessagesForConversation,
    sendMessage,
    markConversationAsRead,
    refetchConversations: fetchConversations
  };
};

export default useGroupMessages;