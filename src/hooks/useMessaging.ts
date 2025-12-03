import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSendSMSNotification } from './useSMSIntegration';

export interface MessageGroup {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  group_type: 'general' | 'executive' | 'voice_section' | 'event' | 'private';
  is_private: boolean;
  is_archived: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id?: string;
  content?: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'system' | 'poll';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_id?: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
  reactions?: MessageReaction[];
  reply_to?: GroupMessage;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user_profile?: {
    full_name?: string;
  };
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'admin' | 'moderator';
  joined_at: string;
  last_read_at?: string;
  is_muted: boolean;
  user_profile?: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
    phone_number?: string;
  };
}

export interface TypingIndicator {
  group_id: string;
  user_id: string;
  user_name: string;
}

// Hook to get user's message groups
export const useMessageGroups = () => {
  return useQuery({
    queryKey: ['message-groups'],
    queryFn: async () => {
      console.log('useMessageGroups: Starting query...');
      
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('useMessageGroups: Auth check result:', { user: user?.id, userError });
      
      if (userError) {
        console.error('useMessageGroups: Auth error:', userError);
        throw userError;
      }
      
      if (!user) {
        console.log('useMessageGroups: No authenticated user found');
        throw new Error('Authentication required');
      }

      console.log('useMessageGroups: Making database query for user:', user.id);

      const { data, error } = await supabase
        .from('gw_message_groups')
        .select(`
          *,
          gw_group_members!inner(
            role,
            last_read_at,
            is_muted
          )
        `)
        .eq('gw_group_members.user_id', user.id)
        .order('updated_at', { ascending: false });

      console.log('useMessageGroups: Database query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('useMessageGroups: Database error:', error);
        throw error;
      }
      
      // Sort groups: "All Members" first, then by updated_at
      const sortedData = (data || []).sort((a, b) => {
        const aIsAllMembers = a.name?.toLowerCase().includes('all members');
        const bIsAllMembers = b.name?.toLowerCase().includes('all members');
        
        if (aIsAllMembers && !bIsAllMembers) return -1;
        if (!aIsAllMembers && bIsAllMembers) return 1;
        
        // Both are or aren't "All Members", sort by updated_at
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      
      return sortedData as MessageGroup[];
    },
    retry: 1,
    staleTime: 0, // Always fetch fresh data
  });
};

// Hook to get messages for a specific group
export const useGroupMessages = (groupId?: string) => {
  return useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('gw_group_messages')
        .select(`
          *,
          user_profile:gw_profiles!fk_gw_group_messages_user_profile(
            full_name,
            avatar_url
          ),
          reactions:gw_message_reactions(
            id,
            emoji,
            user_id,
            message_id,
            created_at,
            user_profile:gw_profiles!fk_gw_message_reactions_user_profile(
              full_name
            )
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching group messages:', error);
        throw error;
      }

      return data as GroupMessage[];
    },
    enabled: !!groupId,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });
};

// Hook to get group members
export const useGroupMembers = (groupId?: string) => {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('gw_group_members')
        .select(`
          *,
          gw_profiles!fk_gw_group_members_user_profile(
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('group_id', groupId)
        .order('joined_at');

      if (error) throw error;

      return data.map(member => ({
        ...member,
        user_profile: member.gw_profiles
      })) as GroupMember[];
    },
    enabled: !!groupId,
  });
};

// Hook for real-time messaging
export const useRealtimeMessaging = (groupId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  useEffect(() => {
    if (!groupId || !user) return;

    console.log('Setting up realtime for group:', groupId);

    // Single channel for all message-related updates
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gw_group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('Message updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_message_reactions'
        },
        (payload) => {
          console.log('Reaction updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = Object.values(state)
          .flat()
          .filter((indicator: any) => indicator.user_id !== user.id) as any[];
        setTypingUsers(typing);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const typing = newPresences.filter((indicator: any) => indicator.user_id !== user.id) as any[];
        setTypingUsers(prev => [...prev, ...typing]);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftUserIds = leftPresences.map((indicator: any) => indicator.user_id);
        setTypingUsers(prev => prev.filter(t => !leftUserIds.includes(t.user_id)));
      })
      .subscribe((status) => {
        console.log('Realtime status:', status);
      });

    return () => {
      console.log('Cleaning up realtime for group:', groupId);
      supabase.removeChannel(channel);
    };
  }, [groupId, user?.id, queryClient]);

  return { typingUsers };
};

// Send message mutation
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sendSMSNotification = useSendSMSNotification();

  return useMutation({
    mutationFn: async ({
      groupId,
      content,
      messageType = 'text',
      fileUrl,
      fileName,
      fileSize,
      replyToId
    }: {
      groupId: string;
      content?: string;
      messageType?: 'text' | 'image' | 'file' | 'audio';
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      replyToId?: string;
    }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('gw_group_messages')
        .insert({
          group_id: groupId,
          user_id: currentUser.id,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          reply_to_id: replyToId
        })
        .select()
        .single();

      if (error) throw error;

      // Send SMS notifications for text messages
      if (messageType === 'text' && content && user?.user_metadata?.full_name) {
        try {
          // Get group name for SMS formatting
          const { data: group } = await supabase
            .from('gw_message_groups')
            .select('name')
            .eq('id', groupId)
            .single();

          if (group) {
            await sendSMSNotification.mutateAsync({
              groupId,
              message: content,
              senderName: user.user_metadata.full_name,
            });
          }
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
          // Don't throw - message was sent successfully, SMS is just a bonus
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['message-groups'] });
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });
};

// Add reaction mutation
export const useAddReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji
    }: {
      messageId: string;
      emoji: string;
    }) => {
      const { data, error } = await supabase
        .from('gw_message_reactions')
        .insert({
          message_id: messageId,
          emoji,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        // If reaction already exists, remove it instead
        if (error.code === '23505') {
          const userId = (await supabase.auth.getUser()).data.user?.id;
          const { error: deleteError } = await supabase
            .from('gw_message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('emoji', emoji)
            .eq('user_id', userId);
          
          if (deleteError) throw deleteError;
          return null;
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages'] });
    },
    onError: (error) => {
      toast.error('Failed to add reaction: ' + error.message);
    },
  });
};

// Update typing indicator
export const useTypingIndicator = (groupId?: string) => {
  const { user } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!groupId || !user) return;

    // Cleanup existing channel first
    if (channelRef.current) {
      console.log('Cleaning up existing typing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create and subscribe to the typing channel
    const channel = supabase.channel(`typing-${groupId}-${Date.now()}`);
    channelRef.current = channel;

    channel.subscribe((status) => {
      console.log('Typing channel status:', status);
    });

    return () => {
      console.log('useMessaging typing cleanup');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [groupId, user?.id]);

  const startTyping = useCallback(async () => {
    if (!groupId || !user || isTyping || !channelRef.current) return;

    setIsTyping(true);
    
    try {
      await channelRef.current.track({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email,
        typing: true
      });
    } catch (error) {
      console.error('Error starting typing indicator:', error);
    }
  }, [groupId, user, isTyping]);

  const stopTyping = useCallback(async () => {
    if (!groupId || !user || !isTyping || !channelRef.current) return;

    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await channelRef.current.untrack();
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  }, [groupId, user, isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
};

// Group management mutations
export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (groupData: {
      name: string;
      description?: string;
      group_type: string;
      is_private: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('gw_message_groups')
        .insert({
          ...groupData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('gw_group_members')
        .insert({
          group_id: data.id,
          user_id: user.id,
          role: 'admin'
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-groups'] });
    }
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, ...updateData }: {
      groupId: string;
      name?: string;
      description?: string;
      group_type?: string;
      is_private?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('gw_message_groups')
        .update(updateData)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-groups'] });
    }
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('gw_message_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-groups'] });
    }
  });
};

// Member management mutations
export const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('gw_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
    }
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from('gw_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
    }
  });
};

// Direct messaging
export const useCreateDirectMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recipientUserId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if direct message group already exists
      const { data: existingGroup } = await supabase
        .from('gw_message_groups')
        .select(`
          *,
          gw_group_members!inner(user_id)
        `)
        .eq('group_type', 'direct')
        .eq('gw_group_members.user_id', user.id);

      // Filter for groups that contain both users
      const directGroup = existingGroup?.find(group => 
        group.gw_group_members.some((member: any) => member.user_id === recipientUserId)
      );

      if (directGroup) {
        return directGroup;
      }

      // Create new direct message group
      const { data: newGroup, error: groupError } = await supabase
        .from('gw_message_groups')
        .insert({
          name: 'Direct Message',
          group_type: 'direct',
          is_private: true,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add both users as members
      const { error: membersError } = await supabase
        .from('gw_group_members')
        .insert([
          { group_id: newGroup.id, user_id: user.id, role: 'member' },
          { group_id: newGroup.id, user_id: recipientUserId, role: 'member' }
        ]);

      if (membersError) throw membersError;

      return newGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-groups'] });
    }
  });
};