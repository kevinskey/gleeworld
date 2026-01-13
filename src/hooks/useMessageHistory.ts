import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MessageHistoryItem {
  id: string;
  user_id: string;
  direction: 'sent' | 'received';
  channel: 'email' | 'sms';
  subject: string | null;
  content: string;
  recipient_emails: string[] | null;
  recipient_phones: string[] | null;
  sender_email: string | null;
  sender_name: string | null;
  status: 'draft' | 'pending' | 'sent' | 'delivered' | 'failed';
  external_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  sent_at: string | null;
  created_at: string;
}

interface MessageHistoryFilters {
  channel?: 'email' | 'sms' | 'all';
  direction?: 'sent' | 'received' | 'all';
  status?: string;
  search?: string;
}

interface GroupedMessages {
  date: string;
  label: string;
  messages: MessageHistoryItem[];
}

const getDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else if (date > weekAgo) {
    return 'This Week';
  } else {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
};

export const useMessageHistory = (filters?: MessageHistoryFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['message-history', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('gw_user_message_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply channel filter
      if (filters?.channel && filters.channel !== 'all') {
        query = query.eq('channel', filters.channel);
      }

      // Apply direction filter
      if (filters?.direction && filters.direction !== 'all') {
        query = query.eq('direction', filters.direction);
      }

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply search filter (on subject and content)
      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.limit(200);

      if (error) {
        console.error('Error fetching message history:', error);
        throw error;
      }

      return (data || []) as MessageHistoryItem[];
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });
};

export const useGroupedMessageHistory = (filters?: MessageHistoryFilters) => {
  const { data: messages, isLoading, error, refetch } = useMessageHistory(filters);

  const groupedMessages: GroupedMessages[] = [];
  const groupMap = new Map<string, MessageHistoryItem[]>();

  if (messages) {
    messages.forEach((msg) => {
      const dateKey = new Date(msg.created_at).toDateString();
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(msg);
    });

    groupMap.forEach((msgs, dateKey) => {
      groupedMessages.push({
        date: dateKey,
        label: getDateLabel(dateKey),
        messages: msgs,
      });
    });
  }

  // Calculate stats
  const stats = {
    total: messages?.length || 0,
    emails: messages?.filter((m) => m.channel === 'email').length || 0,
    sms: messages?.filter((m) => m.channel === 'sms').length || 0,
    sent: messages?.filter((m) => m.direction === 'sent').length || 0,
    received: messages?.filter((m) => m.direction === 'received').length || 0,
    delivered: messages?.filter((m) => m.status === 'delivered').length || 0,
    failed: messages?.filter((m) => m.status === 'failed').length || 0,
  };

  return {
    messages,
    groupedMessages,
    stats,
    isLoading,
    error,
    refetch,
  };
};

export const useLogMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: Omit<MessageHistoryItem, 'id' | 'user_id' | 'created_at'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const insertData = {
        user_id: user.id,
        direction: message.direction,
        channel: message.channel,
        subject: message.subject,
        content: message.content,
        recipient_emails: message.recipient_emails,
        recipient_phones: message.recipient_phones,
        sender_email: message.sender_email,
        sender_name: message.sender_name,
        status: message.status,
        external_id: message.external_id,
        error_message: message.error_message,
        metadata: message.metadata as Record<string, unknown> | null,
        sent_at: message.sent_at,
      };

      const { data, error } = await supabase
        .from('gw_user_message_history')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-history'] });
    },
  });
};
