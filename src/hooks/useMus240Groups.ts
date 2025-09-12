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


export const useMus240Groups = (semester: string = 'Fall 2025') => {
  const [groups, setGroups] = useState<Mus240Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchGroups();
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

  const createGroup = async (groupData: {
    name: string;
    description?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('mus240_project_groups')
        .insert({
          ...groupData,
          leader_id: null,
          semester,
          member_count: 0,
          max_members: 4 // Set max to 4
        })
        .select()
        .single();

      if (error) throw error;
      await fetchGroups();
      return data;
    } catch (err) {
      console.error('Error creating group:', err);
      throw new Error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      // Check if group has space (max 4 members)
      const group = groups.find(g => g.id === groupId);
      if (!group) throw new Error('Group not found');
      if (group.member_count >= 4) throw new Error('Group is full (max 4 members)');
      
      // Check if user is already in the group
      const isAlreadyMember = group.members?.some(member => 
        member.gw_profiles && user.id === member.id
      );
      if (isAlreadyMember) throw new Error('Already a member of this group');
      
      // Add user to group
      const { error } = await supabase
        .from('mus240_group_memberships')
        .insert({
          group_id: groupId,
          member_id: user.id,
          role: 'member'
        });

      if (error) throw error;
      await fetchGroups();
      return { success: true };
    } catch (err) {
      console.error('Error joining group:', err);
      throw err;
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

  return {
    groups,
    loading,
    error,
    createGroup,
    joinGroup,
    deleteGroup,
    leaveGroup,
    updateMemberRole,
    getAvailableGroups,
    getUserGroup,
    refetch: () => {
      fetchGroups();
    }
  };
};