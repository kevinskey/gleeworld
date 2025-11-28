import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Group = Database['public']['Tables']['gw_groups']['Row'];
type GroupMember = Database['public']['Tables']['gw_group_members']['Row'];
type GroupApplication = Database['public']['Tables']['gw_group_applications']['Row'];

interface GroupWithMembers extends Group {
  members?: Array<GroupMember & {
    profile?: {
      full_name: string;
      email: string;
    };
  }>;
  applications?: GroupApplication[];
}

/**
 * Unified hook for managing groups across academy courses
 * Integrates with legacy MUS240 groups via legacy_id/legacy_source
 */
export const useAcademyGroups = (courseId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all groups for a course
  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['academy-groups', courseId],
    queryFn: async (): Promise<GroupWithMembers[]> => {
      if (!courseId) return [];

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('gw_groups')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;
      if (!groupsData || groupsData.length === 0) return [];

      const groupIds = groupsData.map(g => g.id);

      // Fetch members for all groups
      const { data: membersData } = await supabase
        .from('gw_group_members')
        .select(`
          *,
          profile:gw_profiles(full_name, email)
        `)
        .in('group_id', groupIds);

      // Fetch applications for all groups
      const { data: applicationsData } = await supabase
        .from('gw_group_applications')
        .select('*')
        .in('group_id', groupIds);

      // Combine the data
      const groupsWithDetails: GroupWithMembers[] = groupsData.map(group => ({
        ...group,
        members: membersData?.filter(m => m.group_id === group.id) || [],
        applications: applicationsData?.filter(a => a.group_id === group.id) || [],
      }));

      return groupsWithDetails;
    },
    enabled: !!courseId,
  });

  // Get user's current group membership
  const { data: myGroup } = useQuery({
    queryKey: ['my-academy-group', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id || !courseId) return null;

      const { data, error } = await supabase
        .from('gw_group_members')
        .select(`
          *,
          group:gw_groups(*)
        `)
        .eq('user_id', user.id)
        .eq('group.course_id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!courseId,
  });

  // Create a new group
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: {
      name: string;
      description?: string;
      max_members?: number;
      semester?: string;
    }) => {
      if (!user?.id || !courseId) throw new Error('User or course not found');

      const { data, error } = await supabase
        .from('gw_groups')
        .insert({
          course_id: courseId,
          leader_id: user.id,
          name: groupData.name,
          description: groupData.description,
          max_members: groupData.max_members || 5,
          semester: groupData.semester,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-academy-group'] });
      toast.success('Group created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Failed to create group');
    },
  });

  // Apply to join a group
  const applyToGroupMutation = useMutation({
    mutationFn: async ({
      groupId,
      applicationMessage,
    }: {
      groupId: string;
      applicationMessage?: string;
    }) => {
      if (!user?.id) throw new Error('User not found');

      // Get user profile for full name
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('gw_group_applications')
        .insert({
          group_id: groupId,
          applicant_id: user.id,
          full_name: profile?.full_name || 'Unknown',
          application_message: applicationMessage,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-groups'] });
      toast.success('Application submitted');
    },
    onError: (error: any) => {
      console.error('Error applying to group:', error);
      if (error.code === '23505') {
        toast.error('You have already applied to this group');
      } else {
        toast.error(error.message || 'Failed to apply to group');
      }
    },
  });

  // Approve an application (group leader only)
  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      // Get application details
      const { data: application, error: appError } = await supabase
        .from('gw_group_applications')
        .select('*, group:gw_groups(*)')
        .eq('id', applicationId)
        .single();

      if (appError) throw appError;

      // Update application status
      const { error: updateError } = await supabase
        .from('gw_group_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Add member to group
      const { error: memberError } = await supabase
        .from('gw_group_members')
        .insert({
          group_id: application.group_id,
          user_id: application.applicant_id,
          role: 'member',
        });

      if (memberError) throw memberError;

      return application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-groups'] });
      toast.success('Application approved');
    },
    onError: (error: any) => {
      console.error('Error approving application:', error);
      toast.error(error.message || 'Failed to approve application');
    },
  });

  // Reject an application
  const rejectApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('gw_group_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-groups'] });
      toast.success('Application rejected');
    },
    onError: (error: any) => {
      console.error('Error rejecting application:', error);
      toast.error(error.message || 'Failed to reject application');
    },
  });

  // Leave a group
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user?.id) throw new Error('User not found');

      const { error } = await supabase
        .from('gw_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-academy-group'] });
      toast.success('Left group successfully');
    },
    onError: (error: any) => {
      console.error('Error leaving group:', error);
      toast.error(error.message || 'Failed to leave group');
    },
  });

  // Delete a group (leader only)
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('gw_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-academy-group'] });
      toast.success('Group deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting group:', error);
      toast.error(error.message || 'Failed to delete group');
    },
  });

  return {
    groups,
    myGroup,
    isLoading,
    refetch,
    createGroup: createGroupMutation.mutateAsync,
    applyToGroup: applyToGroupMutation.mutateAsync,
    approveApplication: approveApplicationMutation.mutateAsync,
    rejectApplication: rejectApplicationMutation.mutateAsync,
    leaveGroup: leaveGroupMutation.mutateAsync,
    deleteGroup: deleteGroupMutation.mutateAsync,
  };
};
