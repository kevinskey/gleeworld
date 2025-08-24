import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface Communication {
  id: string;
  title: string;
  content: string;
  sender_id: string;
  sender_name: string;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  scheduled_for?: string;
  expires_at?: string;
  metadata: any;
}

interface MessageGroup {
  id: string;
  name: string;
  description?: string;
  type: string;
  query_criteria?: any;
  is_active: boolean;
}

interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  variables: Json;
}

interface RecipientData {
  type: 'individual' | 'group' | 'role' | 'all_members';
  identifier: string;
  email?: string;
  phone?: string;
  name?: string;
}

export const useCommunicationSystem = () => {
  const { user } = useAuth();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's communications
  const fetchCommunications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_communication_system')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCommunications(data || []);
    } catch (error: any) {
      console.error('Error fetching communications:', error);
      toast.error('Failed to load communications');
    }
  };

  // Fetch message groups
  const fetchMessageGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_message_groups')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMessageGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching message groups:', error);
      toast.error('Failed to load message groups');
    }
  };

  // Fetch communication templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_communication_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    }
  };

  // Get recipients for a group
  const getGroupRecipients = async (groupId: string): Promise<RecipientData[]> => {
    try {
      // Get group info
      const { data: group, error: groupError } = await supabase
        .from('gw_message_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      if (group.type === 'custom') {
        // Get explicit group members
        const { data: members, error: membersError } = await supabase
          .from('gw_group_members')
          .select(`
            user_id,
            gw_profiles!inner(
              user_id,
              email,
              full_name,
              phone_number
            )
          `)
          .eq('group_id', groupId);

        if (membersError) throw membersError;

        return members.map(member => ({
          type: 'individual',
          identifier: member.user_id,
          email: member.gw_profiles.email,
          phone: member.gw_profiles.phone_number,
          name: member.gw_profiles.full_name
        }));
      } else {
        // Dynamic group based on query criteria
        let query = supabase
          .from('gw_profiles')
          .select('user_id, email, full_name, phone_number');

        if (group.query_criteria && typeof group.query_criteria === 'object') {
          const criteria = group.query_criteria as Record<string, any>;
          
          if (criteria.role) {
            query = query.eq('role', criteria.role);
          }
          if (criteria.voice_part) {
            query = query.eq('voice_part', criteria.voice_part);
          }
          if (criteria.academic_year) {
            query = query.eq('academic_year', criteria.academic_year);
          }
          if (criteria.is_exec_board) {
            query = query.eq('is_exec_board', criteria.is_exec_board);
          }
          if (criteria.status) {
            query = query.eq('status', criteria.status);
          }
        }

        const { data: profiles, error: profilesError } = await query;
        if (profilesError) throw profilesError;

        return profiles.map(profile => ({
          type: 'individual',
          identifier: profile.user_id,
          email: profile.email,
          phone: profile.phone_number,
          name: profile.full_name
        }));
      }
    } catch (error: any) {
      console.error('Error getting group recipients:', error);
      toast.error(`Failed to get recipients for group: ${error.message}`);
      return [];
    }
  };

  // Send communication
  const sendCommunication = async (
    title: string,
    content: string,
    recipientGroups: string[],
    channels: string[],
    type: string = 'announcement',
    priority: string = 'normal',
    scheduledFor?: string
  ) => {
    if (!user) {
      toast.error('You must be logged in to send communications');
      return null;
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('gw_profiles')
      .select('full_name, email, is_admin')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      toast.error('User profile not found');
      return null;
    }

    setLoading(true);

    try {
      // Create communication record
      const { data: communication, error: commError } = await supabase
        .from('gw_communication_system')
        .insert({
          title,
          content,
          sender_id: user.id,
          sender_name: userProfile.full_name || userProfile.email,
          type,
          priority,
          status: scheduledFor ? 'scheduled' : 'sending',
          scheduled_for: scheduledFor
        })
        .select()
        .single();

      if (commError) throw commError;

      // Collect all recipients
      const allRecipients: RecipientData[] = [];

      for (const groupId of recipientGroups) {
        if (groupId === 'all_members') {
          // Special case for all members
          const { data: allProfiles, error: allError } = await supabase
            .from('gw_profiles')
            .select('user_id, email, full_name, phone_number')
            .eq('status', 'active');

          if (allError) throw allError;

          allRecipients.push(...allProfiles.map(profile => ({
            type: 'all_members' as const,
            identifier: profile.user_id,
            email: profile.email,
            phone: profile.phone_number,
            name: profile.full_name
          })));
        } else {
          const groupRecipients = await getGroupRecipients(groupId);
          allRecipients.push(...groupRecipients);
        }
      }

      // Remove duplicates based on identifier
      const uniqueRecipients = allRecipients.filter((recipient, index, self) =>
        index === self.findIndex(r => r.identifier === recipient.identifier)
      );

      console.log('Sending to recipients:', uniqueRecipients.length);

      // If not scheduled, send immediately
      if (!scheduledFor) {
        const { data: result, error: sendError } = await supabase.functions.invoke(
          'send-unified-communication',
          {
            body: {
              communicationId: communication.id,
              title,
              content,
              senderName: userProfile.full_name || userProfile.email,
              recipients: uniqueRecipients.map(r => ({
                id: r.identifier,
                ...r
              })),
              channels
            }
          }
        );

        if (sendError) throw sendError;

        toast.success(`Communication sent to ${uniqueRecipients.length} recipients`);
        console.log('Send result:', result);
      } else {
        toast.success('Communication scheduled successfully');
      }

      await fetchCommunications();
      return communication;

    } catch (error: any) {
      console.error('Error sending communication:', error);
      toast.error(`Failed to send communication: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a new message group
  const createMessageGroup = async (
    name: string,
    description: string,
    type: string,
    queryCriteria?: any
  ) => {
    if (!user) {
      toast.error('You must be logged in to create message groups');
      return null;
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.is_admin && !userProfile?.is_super_admin) {
      toast.error('Only administrators can create message groups');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('gw_message_groups')
        .insert({
          name,
          description,
          type,
          query_criteria: queryCriteria,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Message group created successfully');
      await fetchMessageGroups();
      return data;
    } catch (error: any) {
      console.error('Error creating message group:', error);
      toast.error(`Failed to create message group: ${error.message}`);
      return null;
    }
  };

  // Add member to group
  const addGroupMember = async (groupId: string, userId: string) => {
    if (!user) {
      toast.error('You must be logged in to manage group members');
      return false;
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.is_admin && !userProfile?.is_super_admin) {
      toast.error('Only administrators can manage group members');
      return false;
    }

    try {
      const { error } = await supabase
        .from('gw_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          added_by: user.id
        });

      if (error) throw error;
      toast.success('Member added to group');
      return true;
    } catch (error: any) {
      console.error('Error adding group member:', error);
      toast.error(`Failed to add member: ${error.message}`);
      return false;
    }
  };

  // Save as draft
  const saveDraft = async (
    title: string,
    content: string,
    type: string = 'announcement'
  ) => {
    if (!user) return null;

    // Get user profile
    const { data: userProfile } = await supabase
      .from('gw_profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) return null;

    try {
      const { data, error } = await supabase
        .from('gw_communication_system')
        .insert({
          title,
          content,
          sender_id: user.id,
          sender_name: userProfile.full_name || userProfile.email,
          type,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Draft saved successfully');
      await fetchCommunications();
      return data;
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast.error(`Failed to save draft: ${error.message}`);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchCommunications();
      fetchMessageGroups();
      fetchTemplates();
    }
  }, [user]);

  return {
    communications,
    messageGroups,
    templates,
    loading,
    sendCommunication,
    createMessageGroup,
    addGroupMember,
    saveDraft,
    getGroupRecipients,
    fetchCommunications,
    fetchMessageGroups,
    fetchTemplates
  };
};