import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Mus240Group {
  id: string;
  name: string;
  description?: string;
  leader_id: string;
  semester: string;
  member_count: number;
  max_members: number;
  is_official: boolean;
  created_at: string;
  updated_at: string;
  leader_profile?: {
    full_name: string;
    email: string;
  } | null;
  members?: {
    id: string;
    role: string;
    gw_profiles: {
      full_name: string;
      email: string;
    } | null;
  }[];
}

export interface GroupApplication {
  id: string;
  group_id: string;
  applicant_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  main_skill_set: string;
  other_skills?: string;
  motivation?: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export const useMus240Groups = (semester: string = 'Fall 2025') => {
  const [groups, setGroups] = useState<Mus240Group[]>([]);
  const [applications, setApplications] = useState<GroupApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchApplications();
    }
  }, [user, semester]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_project_groups')
        .select(`
          *,
          leader_profile:gw_profiles!leader_id(full_name, email),
          members:mus240_group_memberships(
            id, role,
            gw_profiles!member_id(full_name, email)
          )
        `)
        .eq('semester', semester)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data as any || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_group_applications')
        .select('*')
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data as any || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (groupData: {
    name: string;
    description?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('mus240_project_groups')
        .insert({
          ...groupData,
          leader_id: null, // No automatic leader assignment
          semester,
          member_count: 0 // Start with no members
        })
        .select()
        .single();

      if (error) throw error;

      // Do not automatically add creator as member/leader
      await fetchGroups();
      return data;
    } catch (err) {
      console.error('Error creating group:', err);
      throw new Error('Failed to create group');
    }
  };

  const applyToGroup = async (applicationData: {
    group_id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    main_skill_set: string;
    other_skills?: string;
    motivation?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('mus240_group_applications')
        .insert({
          ...applicationData,
          applicant_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      await fetchApplications();
      return data;
    } catch (err) {
      console.error('Error applying to group:', err);
      throw new Error('Failed to apply to group');
    }
  };

  const reviewApplication = async (
    applicationId: string,
    status: 'accepted' | 'rejected'
  ) => {
    try {
      const { error } = await supabase
        .from('mus240_group_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', applicationId);

      if (error) throw error;

      // If accepted, add to group memberships
      if (status === 'accepted') {
        const application = applications.find(app => app.id === applicationId);
        if (application) {
          await supabase
            .from('mus240_group_memberships')
            .insert({
              group_id: application.group_id,
              member_id: application.applicant_id,
              role: 'member'
            });
        }
      }

      await fetchApplications();
      await fetchGroups();
    } catch (err) {
      console.error('Error reviewing application:', err);
      throw new Error('Failed to review application');
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('mus240_project_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      await fetchGroups();
    } catch (err) {
      console.error('Error deleting group:', err);
      throw new Error('Failed to delete group');
    }
  };

  // Leave group function
  const leaveGroup = async (groupId: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase.rpc('leave_mus240_group', {
        p_group_id: groupId,
        p_member_id: user.id
      });
      
      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Failed to leave group');
      
      // Refresh data
      await fetchGroups();
      return result;
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  };

  // Update member role function
  const updateMemberRole = async (groupId: string, memberId: string, newRole: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase.rpc('update_mus240_member_role', {
        p_group_id: groupId,
        p_member_id: memberId,
        p_new_role: newRole,
        p_requester_id: user.id
      });
      
      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Failed to update member role');
      
      // Refresh data
      await fetchGroups();
      return result;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  };

  const getAvailableGroups = () => {
    return groups.filter(group => group.member_count < group.max_members);
  };

  const getUserGroup = () => {
    return groups.find(group => 
      group.leader_id === user?.id || 
      group.members?.some(member => member.gw_profiles && user?.id)
    );
  };

  const getUserApplications = () => {
    return applications.filter(app => app.applicant_id === user?.id);
  };

  const getGroupApplications = (groupId: string) => {
    return applications.filter(app => app.group_id === groupId);
  };

  return {
    groups,
    applications,
    loading,
    error,
    createGroup,
    applyToGroup,
    reviewApplication,
    deleteGroup,
    leaveGroup,
    updateMemberRole,
    getAvailableGroups,
    getUserGroup,
    getUserApplications,
    getGroupApplications,
    refetch: () => {
      fetchGroups();
      fetchApplications();
    }
  };
};