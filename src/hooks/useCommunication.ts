import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { 
  Communication, 
  CommunicationDelivery, 
  MessageTemplate, 
  RecipientGroup,
  RECIPIENT_GROUPS 
} from '@/types/communication';

export const useCommunication = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const { toast } = useToast();

  const fetchCommunications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gw_communications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunications((data || []).map(item => ({
        ...item,
        recipient_groups: typeof item.recipient_groups === 'string' 
          ? JSON.parse(item.recipient_groups) as RecipientGroup[]
          : Array.isArray(item.recipient_groups) 
            ? item.recipient_groups as unknown as RecipientGroup[]
            : [],
        delivery_summary: typeof item.delivery_summary === 'object' && item.delivery_summary !== null 
          ? item.delivery_summary as Record<string, any>
          : {},
        status: item.status as Communication['status'],
        sender_id: item.sender_id || '',
        scheduled_for: item.scheduled_for || undefined,
        sent_at: item.sent_at || undefined,
        template_id: item.template_id || undefined
      } as Communication)));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch communications: " + error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gw_message_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch templates: " + error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const getRecipientCount = useCallback(async (groups: RecipientGroup[]): Promise<number> => {
    if (groups.length === 0) return 0;

    try {
      let totalCount = 0;
      const processedUserIds = new Set<string>();

      for (const group of groups) {
        let query = supabase.from('gw_profiles').select('user_id', { count: 'exact', head: true });

        switch (group.type) {
          case 'role':
            if (group.id === 'doc') {
              query = query.eq('is_super_admin', true);
            } else if (group.id === 'executive_board') {
              const { data: execData } = await supabase
                .from('gw_executive_board_members')
                .select('user_id')
                .eq('is_active', true);
              
              if (execData) {
                execData.forEach(member => processedUserIds.add(member.user_id));
              }
              continue;
            } else if (group.id === 'section_leaders') {
              const { data: sectionData } = await supabase
                .from('gw_executive_board_members')
                .select('user_id')
                .eq('is_active', true)
                .in('position', ['section_leader_s1', 'section_leader_s2', 'section_leader_a1', 'section_leader_a2']);
              
              if (sectionData) {
                sectionData.forEach(member => processedUserIds.add(member.user_id));
              }
              continue;
            } else if (group.id === 'student_conductor') {
              const { data: conductorData } = await supabase
                .from('gw_executive_board_members')
                .select('user_id')
                .eq('is_active', true)
                .eq('position', 'student_conductor');
              
              if (conductorData) {
                conductorData.forEach(member => processedUserIds.add(member.user_id));
              }
              continue;
            }
            break;

          case 'voice_part':
            const voicePartMap = {
              'soprano_1': 'Soprano 1',
              'soprano_2': 'Soprano 2',
              'alto_1': 'Alto 1',
              'alto_2': 'Alto 2'
            };
            query = query.eq('voice_part', voicePartMap[group.id as keyof typeof voicePartMap]);
            break;

          case 'academic_year':
            const currentYear = new Date().getFullYear();
            let graduationYear;
            
            switch (group.id) {
              case 'first_years':
                graduationYear = currentYear + 4;
                break;
              case 'sophomores':
                graduationYear = currentYear + 3;
                break;
              case 'juniors':
                graduationYear = currentYear + 2;
                break;
              case 'seniors':
                graduationYear = currentYear + 1;
                break;
            }
            
            if (graduationYear) {
              query = query.eq('graduation_year', graduationYear);
            }
            break;

          case 'special':
            if (group.id === 'alumnae') {
              query = query.eq('role', 'alumna');
            } else if (group.id === 'all_users') {
              query = query.neq('user_id', '00000000-0000-0000-0000-000000000000'); // All users
            } else if (group.id.startsWith('direct_email:')) {
              // Count a single direct email (not tied to a user profile)
              totalCount += 1;
              continue;
            } else if (group.id.startsWith('direct_user:')) {
              // Count a specific user by id (ensure uniqueness)
              const userId = group.id.split(':')[1];
              if (userId) processedUserIds.add(userId);
              continue;
            }
            break;
        }

        const { count, error } = await query;
        if (error) throw error;
        
        totalCount += count || 0;
      }

      // Add executive board members count
      totalCount += processedUserIds.size;

      return totalCount;
    } catch (error) {
      console.error('Error getting recipient count:', error);
      return 0;
    }
  }, []);

  const sendCommunication = useCallback(async (
    title: string,
    content: string,
    recipientGroups: RecipientGroup[],
    channels: string[],
    scheduledFor?: Date
  ) => {
    setIsLoading(true);
    try {
      const totalRecipients = await getRecipientCount(recipientGroups);

      const { data: communication, error: commError } = await supabase
        .from('gw_communications')
        .insert({
          title,
          content,
          recipient_groups: JSON.stringify(recipientGroups),
          channels,
          total_recipients: totalRecipients,
          status: scheduledFor ? 'scheduled' : 'sending',
          scheduled_for: scheduledFor?.toISOString()
        })
        .select()
        .single();

      if (commError) throw commError;

      // Call the unified communication edge function
      const { error: sendError } = await supabase.functions.invoke('send-unified-communication', {
        body: {
          communication_id: communication.id,
          title,
          content,
          recipient_groups: recipientGroups,
          channels,
          scheduled_for: scheduledFor?.toISOString()
        }
      });

      if (sendError) throw sendError;

      toast({
        title: "Success",
        description: scheduledFor 
          ? "Communication scheduled successfully"
          : "Communication sent successfully",
      });

      await fetchCommunications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send communication: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getRecipientCount, fetchCommunications, toast]);

  const saveDraft = useCallback(async (
    title: string,
    content: string,
    recipientGroups: RecipientGroup[],
    channels: string[],
    templateId?: string
  ) => {
    try {
      const totalRecipients = await getRecipientCount(recipientGroups);

      const { error } = await supabase
        .from('gw_communications')
        .insert({
          title,
          content,
          recipient_groups: JSON.stringify(recipientGroups),
          channels,
          total_recipients: totalRecipients,
          status: 'draft',
          template_id: templateId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft saved successfully",
      });

      await fetchCommunications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save draft: " + error.message,
        variant: "destructive",
      });
    }
  }, [getRecipientCount, fetchCommunications, toast]);

  const createTemplate = useCallback(async (
    name: string,
    subject: string,
    content: string,
    category: string,
    variables: string[]
  ) => {
    try {
      const { error } = await supabase
        .from('gw_message_templates')
        .insert({
          name,
          subject,
          content,
          category,
          variables
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template created successfully",
      });

      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create template: " + error.message,
        variant: "destructive",
      });
    }
  }, [fetchTemplates, toast]);

  return {
    isLoading,
    communications,
    templates,
    fetchCommunications,
    fetchTemplates,
    getRecipientCount,
    sendCommunication,
    saveDraft,
    createTemplate,
  };
};