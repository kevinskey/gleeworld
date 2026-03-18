import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { uploadFileAndGetUrl } from '@/utils/storage';

interface Message {
  id: string;
  conversation_id: string;
  sender_phone?: string;
  sender_user_id?: string | null;
  sender_name?: string;
  message_body?: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
  message_type?: 'text' | 'image' | 'file' | 'audio';
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
}

interface Conversation {
  id: string;
  name: string;
  group_type: string;
  twilio_phone_number: string;
  is_active: boolean;
  last_message?: Message;
  unread_count: number;
  user_role?: string;
  folder_id?: string | null;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_collapsed: boolean;
}

export const useGroupMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchFolders();
    }
  }, [user]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_message_folders')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);

      if (!user) return;

      const { data: groups, error: groupsError } = await supabase
        .from('gw_message_groups')
        .select('*')
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (groupsError) throw groupsError;

      const { data: memberships, error: membershipsError } = await supabase
        .from('gw_group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      const roleMap = new Map((memberships || []).map((membership) => [membership.group_id, membership.role]));
      const userProfile = await getUserProfile();

      const seenIds = new Set<string>();
      const accessibleConversations: Conversation[] = (groups || [])
        .filter((group) => {
          if (seenIds.has(group.id)) return false;
          seenIds.add(group.id);
          return true;
        })
        .map((group) => ({
          id: group.id,
          name: group.name,
          group_type: group.type || group.group_type || 'general',
          twilio_phone_number: '',
          is_active: true,
          unread_count: 0,
          user_role: roleMap.get(group.id),
          folder_id: group.folder_id,
        }))
        .filter((conversation) => hasAccessToGroup(conversation, userProfile))
        .sort((a, b) => {
          const aIsAllMembers = a.name.toLowerCase().includes('all members');
          const bIsAllMembers = b.name.toLowerCase().includes('all members');

          if (aIsAllMembers && !bIsAllMembers) return -1;
          if (!aIsAllMembers && bIsAllMembers) return 1;

          return a.name.localeCompare(b.name);
        });

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

  const hasAccessToGroup = (conversation: Conversation, userProfile: any) => {
    if (!userProfile) return false;

    if (userProfile.is_admin || userProfile.is_super_admin) {
      return true;
    }

    if (conversation.user_role) {
      return true;
    }

    const groupName = conversation.name.toLowerCase();

    if (groupName.includes('executive') || groupName.includes('exec')) {
      return userProfile.is_exec_board;
    }

    if (groupName.includes('section leader')) {
      return userProfile.is_exec_board;
    }

    if (groupName.includes('soprano 1') || groupName.includes('s1')) {
      return userProfile.voice_part === 'S1';
    }

    if (groupName.includes('soprano 2') || groupName.includes('s2')) {
      return userProfile.voice_part === 'S2';
    }

    if (groupName.includes('alto 1') || groupName.includes('a1')) {
      return userProfile.voice_part === 'A1';
    }

    if (groupName.includes('alto 2') || groupName.includes('a2')) {
      return userProfile.voice_part === 'A2';
    }

    if (groupName.includes('all members')) {
      return ['member', 'executive', 'staff'].includes(userProfile.role);
    }

    if (groupName.includes('alumnae')) {
      return userProfile.role === 'alumna';
    }

    return ['member', 'executive', 'staff'].includes(userProfile.role);
  };

  const fetchMessagesForConversation = async (conversationId: string) => {
    try {
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

      const conversationMessages: Message[] = (groupMessages || []).map((message) => ({
        id: message.id,
        conversation_id: conversationId,
        sender_phone: message.user_profile?.phone_number,
        sender_user_id: message.user_id,
        sender_name: message.user_profile?.full_name || 'Unknown',
        message_body: message.content,
        direction: message.user_id === user?.id ? 'outbound' : 'inbound',
        status: 'delivered',
        created_at: message.created_at,
        message_type: message.message_type,
        file_url: message.file_url,
        file_name: message.file_name,
        file_size: message.file_size,
      }));

      setMessages((prev) => ({
        ...prev,
        [conversationId]: conversationMessages,
      }));

      return conversationMessages;
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
      return [];
    }
  };

  const sendMessage = async (conversationId: string, message: string, sendSMS: boolean = true, file?: File) => {
    if (!user) throw new Error('User not authenticated');

    const trimmedMessage = message.trim();
    if (!trimmedMessage && !file) {
      throw new Error('Message content is required');
    }

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

      const messagePreview = trimmedMessage || (file ? `${messageType === 'audio' ? 'Audio' : 'File'} attachment: ${file.name}` : 'New message');

      const { error: inAppError } = await supabase
        .from('gw_group_messages')
        .insert({
          group_id: conversationId,
          user_id: user.id,
          content: trimmedMessage || fileName || null,
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
        });

      if (inAppError) throw inAppError;

      if (sendSMS) {
        try {
          const response = await supabase.functions.invoke('send-group-sms', {
            body: {
              conversationId,
              message: messagePreview,
              senderUserId: user.id,
              senderName: user.user_metadata?.full_name || 'Unknown User',
              mediaUrl: fileUrl,
            },
          });

          if (response.error) {
            console.log('SMS delivery issue:', response.error);
          }
        } catch (smsErr) {
          console.log('SMS send failed (in-app message still delivered):', smsErr);
        }
      }

      await fetchMessagesForConversation(conversationId);

      return { success: true, smsSent: sendSMS };
    } catch (err: any) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation,
      ),
    );
  };

  const deleteGroup = async (groupId: string) => {
    try {
      console.log('Attempting to delete group:', groupId);
      
      const { data, error, count } = await supabase
        .from('gw_message_groups')
        .update({ is_archived: true, is_active: false })
        .eq('id', groupId)
        .select();

      console.log('Delete result:', { data, error, count });

      if (error) throw error;
      
      // Check if any rows were actually updated (RLS might silently block)
      if (!data || data.length === 0) {
        throw new Error('Failed to delete group - you may not have permission');
      }

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== groupId));
      
      // Clear messages for this group
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[groupId];
        return newMessages;
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting group:', err);
      throw err;
    }
  };

  const updateGroup = async (groupId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('gw_message_groups')
        .update({ name: newName })
        .eq('id', groupId);

      if (error) throw error;

      // Update local state
      setConversations(prev => prev.map(conv => 
        conv.id === groupId ? { ...conv, name: newName } : conv
      ));

      return { success: true };
    } catch (err: any) {
      console.error('Error updating group:', err);
      throw err;
    }
  };

  const createFolder = async (name: string, color?: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_message_folders')
        .insert({ 
          name, 
          color: color || '#6366f1',
          created_by: user?.id 
        })
        .select()
        .single();

      if (error) throw error;
      
      setFolders(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      console.error('Error creating folder:', err);
      throw err;
    }
  };

  const updateFolder = async (folderId: string, updates: Partial<Folder>) => {
    try {
      const { error } = await supabase
        .from('gw_message_folders')
        .update(updates)
        .eq('id', folderId);

      if (error) throw error;

      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, ...updates } : f
      ));
    } catch (err: any) {
      console.error('Error updating folder:', err);
      throw err;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      // First, unassign all groups from this folder
      await supabase
        .from('gw_message_groups')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      const { error } = await supabase
        .from('gw_message_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      setFolders(prev => prev.filter(f => f.id !== folderId));
      setConversations(prev => prev.map(c => 
        c.folder_id === folderId ? { ...c, folder_id: null } : c
      ));
    } catch (err: any) {
      console.error('Error deleting folder:', err);
      throw err;
    }
  };

  const moveGroupToFolder = async (groupId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('gw_message_groups')
        .update({ folder_id: folderId })
        .eq('id', groupId);

      if (error) throw error;

      setConversations(prev => prev.map(c => 
        c.id === groupId ? { ...c, folder_id: folderId } : c
      ));
    } catch (err: any) {
      console.error('Error moving group to folder:', err);
      throw err;
    }
  };

  return {
    conversations,
    folders,
    messages,
    loading,
    error,
    fetchMessagesForConversation,
    sendMessage,
    markConversationAsRead,
    deleteGroup,
    updateGroup,
    createFolder,
    updateFolder,
    deleteFolder,
    moveGroupToFolder,
    refetchConversations: fetchConversations,
    refetchFolders: fetchFolders
  };
};

export default useGroupMessages;