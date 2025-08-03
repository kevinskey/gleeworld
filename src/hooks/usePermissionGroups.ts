import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PermissionGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupPermission {
  id: string;
  group_id: string;
  permission_id: string;
  permission_level: 'view' | 'edit' | 'full' | 'admin';
  permission_scope: 'own' | 'department' | 'system';
  created_at: string;
}

export interface UserGroupAssignment {
  id: string;
  user_id: string;
  group_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export const usePermissionGroups = () => {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permission_groups')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (err: any) {
      console.error('Error fetching permission groups:', err);
      toast({
        title: "Error",
        description: "Failed to fetch permission groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (groupData: {
    name: string;
    description?: string;
    color?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('permission_groups')
        .insert([{
          name: groupData.name,
          description: groupData.description || null,
          color: groupData.color || '#6366f1'
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Permission group created successfully",
      });
      
      await fetchGroups();
      return data;
    } catch (err: any) {
      console.error('Error creating permission group:', err);
      toast({
        title: "Error",
        description: "Failed to create permission group",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateGroup = async (id: string, updates: Partial<PermissionGroup>) => {
    try {
      const { error } = await supabase
        .from('permission_groups')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Permission group updated successfully",
      });
      
      await fetchGroups();
      return true;
    } catch (err: any) {
      console.error('Error updating permission group:', err);
      toast({
        title: "Error",
        description: "Failed to update permission group",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('permission_groups')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Permission group deleted successfully",
      });
      
      await fetchGroups();
      return true;
    } catch (err: any) {
      console.error('Error deleting permission group:', err);
      toast({
        title: "Error",
        description: "Failed to delete permission group",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return {
    groups,
    loading,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
};

export const useGroupPermissions = (groupId?: string) => {
  const [permissions, setPermissions] = useState<GroupPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchGroupPermissions = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permission_group_permissions')
        .select('*')
        .eq('group_id', id);

      if (error) throw error;
      setPermissions((data || []) as GroupPermission[]);
    } catch (err: any) {
      console.error('Error fetching group permissions:', err);
      toast({
        title: "Error",
        description: "Failed to fetch group permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGroupPermissions = async (
    groupId: string, 
    permissionUpdates: Array<{
      permission_id: string;
      permission_level: string;
      permission_scope: string;
      enabled: boolean;
    }>
  ) => {
    try {
      // First, delete all existing permissions for this group
      await supabase
        .from('permission_group_permissions')
        .delete()
        .eq('group_id', groupId);

      // Then insert the new permissions
      const permissionsToInsert = permissionUpdates
        .filter(p => p.enabled)
        .map(p => ({
          group_id: groupId,
          permission_id: p.permission_id,
          permission_level: p.permission_level,
          permission_scope: p.permission_scope,
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('permission_group_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Group permissions updated successfully",
      });

      await fetchGroupPermissions(groupId);
      return true;
    } catch (err: any) {
      console.error('Error updating group permissions:', err);
      toast({
        title: "Error",
        description: "Failed to update group permissions",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroupPermissions(groupId);
    }
  }, [groupId]);

  return {
    permissions,
    loading,
    fetchGroupPermissions,
    updateGroupPermissions,
  };
};

export const useUserGroupAssignments = () => {
  const [assignments, setAssignments] = useState<UserGroupAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUserAssignments = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_permission_groups')
        .select(`
          *,
          permission_groups (
            id,
            name,
            description,
            color
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      setAssignments(data || []);
    } catch (err: any) {
      console.error('Error fetching user assignments:', err);
      toast({
        title: "Error",
        description: "Failed to fetch user assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignUserToGroup = async (userId: string, groupId: string, expiresAt?: string) => {
    try {
      const { error } = await supabase
        .from('user_permission_groups')
        .upsert({
          user_id: userId,
          group_id: groupId,
          expires_at: expiresAt || null,
          is_active: true,
        }, {
          onConflict: 'user_id,group_id'
        });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User assigned to group successfully",
      });
      
      return true;
    } catch (err: any) {
      console.error('Error assigning user to group:', err);
      toast({
        title: "Error",
        description: "Failed to assign user to group",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeUserFromGroup = async (userId: string, groupId: string) => {
    try {
      const { error } = await supabase
        .from('user_permission_groups')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('group_id', groupId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User removed from group successfully",
      });
      
      return true;
    } catch (err: any) {
      console.error('Error removing user from group:', err);
      toast({
        title: "Error",
        description: "Failed to remove user from group",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    assignments,
    loading,
    fetchUserAssignments,
    assignUserToGroup,
    removeUserFromGroup,
  };
};