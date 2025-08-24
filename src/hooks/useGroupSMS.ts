import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateConversationData {
  groupId: string;
  twilioPhoneNumber: string;
}

interface SendGroupSMSData {
  conversationId: string;
  message: string;
  senderUserId: string;
  senderName: string;
}

interface SMSMessage {
  id: string;
  conversation_id: string;
  sender_phone: string;
  sender_user_id: string | null;
  message_body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
  gw_profiles?: {
    full_name: string;
    first_name: string;
  } | null;
}

// Hook to create a new SMS conversation for a group
export const useCreateSMSConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateConversationData) => {
      const { data: result, error } = await supabase
        .from('gw_sms_conversations')
        .insert({
          group_id: data.groupId,
          twilio_phone_number: data.twilioPhoneNumber,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
      toast.success('SMS conversation created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating SMS conversation:', error);
      toast.error('Failed to create SMS conversation');
    }
  });
};

// Hook to send a group SMS message
export const useSendGroupSMS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendGroupSMSData) => {
      const { data: result, error } = await supabase.functions.invoke('send-group-sms', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidate conversation messages to refresh the UI
      queryClient.invalidateQueries({ 
        queryKey: ['sms-messages', variables.conversationId] 
      });
      
      if (result.totalSent > 0) {
        toast.success(`Message sent to ${result.totalSent} group members`);
      }
      if (result.totalFailed > 0) {
        toast.warning(`Failed to send to ${result.totalFailed} members`);
      }
    },
    onError: (error: any) => {
      console.error('Error sending group SMS:', error);
      toast.error('Failed to send group message');
    }
  });
};

// Hook to get SMS conversations for a group
export const useGroupSMSConversations = (groupId?: string) => {
  return useQuery({
    queryKey: ['sms-conversations', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('gw_sms_conversations')
        .select(`
          *,
          gw_message_groups!inner(name)
        `)
        .eq('group_id', groupId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId
  });
};

// Hook to get messages for an SMS conversation
export const useSMSConversationMessages = (conversationId?: string) => {
  return useQuery({
    queryKey: ['sms-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('gw_sms_messages')
        .select(`
          *,
          gw_profiles(full_name, first_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
    refetchInterval: 5000 // Refresh every 5 seconds to get new messages
  });
};

// Hook to check if a group has SMS enabled
export const useGroupSMSStatus = (groupId?: string) => {
  return useQuery({
    queryKey: ['group-sms-status', groupId],
    queryFn: async () => {
      if (!groupId) return { hasConversation: false, conversation: null };

      const { data, error } = await supabase
        .from('gw_sms_conversations')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return {
        hasConversation: !!data,
        conversation: data
      };
    },
    enabled: !!groupId
  });
};

// Real-time subscription for SMS messages
export const useRealtimeSMSMessages = (conversationId?: string) => {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  return useQuery({
    queryKey: ['realtime-sms-setup', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const channel = supabase
        .channel(`sms-messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'gw_sms_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            console.log('New SMS message received:', payload);
            // Invalidate and refetch messages
            queryClient.invalidateQueries({ 
              queryKey: ['sms-messages', conversationId] 
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    enabled: !!conversationId,
    staleTime: Infinity, // Keep this subscription active
    refetchOnWindowFocus: false
  });
};