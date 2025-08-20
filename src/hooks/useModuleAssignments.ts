import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ModuleAssignment {
  id: string;
  module_id: string;
  assigned_to_user_id?: string;
  assigned_to_group?: string;
  assigned_by?: string;
  assignment_type: 'individual' | 'group' | 'role';
  permissions: string[];
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  // Expanded fields
  module_name?: string;
  assigned_user_name?: string;
  assigned_by_name?: string;
}

export interface CreateAssignmentData {
  module_name: string;
  assignment_type: 'individual' | 'group' | 'role';
  assigned_to_user_id?: string;
  assigned_to_group?: string;
  permissions?: string[];
  expires_at?: string;
  notes?: string;
}

export const useModuleAssignments = () => {
  const [assignments, setAssignments] = useState<ModuleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_module_assignments')
        .select(`
          *,
          gw_modules!inner(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAssignments: ModuleAssignment[] = (data || []).map(assignment => ({
        ...assignment,
        assignment_type: assignment.assignment_type as 'individual' | 'group' | 'role',
        module_name: assignment.gw_modules?.name,
        assigned_user_name: '',
        assigned_by_name: '',
      }));

      setAssignments(formattedAssignments);
    } catch (err) {
      console.error('Error fetching module assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (assignmentData: CreateAssignmentData) => {
    try {
      console.log('Creating assignment for module:', assignmentData.module_name);
      
      // First get the module ID
      const { data: moduleData, error: moduleError } = await supabase
        .from('gw_modules')
        .select('id, name')
        .eq('name', assignmentData.module_name)
        .eq('is_active', true)
        .maybeSingle();

      console.log('Module lookup result:', { moduleData, moduleError });

      if (moduleError) {
        console.error('Module lookup error:', moduleError);
        throw moduleError;
      }

      if (!moduleData) {
        const errorMsg = `Module "${assignmentData.module_name}" not found`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const { data, error } = await supabase
        .from('gw_module_assignments')
        .insert({
          module_id: moduleData.id,
          assignment_type: assignmentData.assignment_type,
          assigned_to_user_id: assignmentData.assigned_to_user_id,
          assigned_to_group: assignmentData.assigned_to_group,
          permissions: assignmentData.permissions || ['view'],
          expires_at: assignmentData.expires_at,
          notes: assignmentData.notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Assignment creation error:', error);
        throw error;
      }

      console.log('Assignment created successfully:', data);

      toast({
        title: "Assignment Created",
        description: "Module assignment has been created successfully.",
      });

      await fetchAssignments();
      return data;
    } catch (err) {
      console.error('Error creating assignment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create assignment';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateAssignment = async (id: string, updates: Partial<ModuleAssignment>) => {
    try {
      const { data, error } = await supabase
        .from('gw_module_assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Assignment Updated",
        description: "Module assignment has been updated successfully.",
      });

      await fetchAssignments();
      return data;
    } catch (err) {
      console.error('Error updating assignment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update assignment';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_module_assignments')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Assignment Removed",
        description: "Module assignment has been removed successfully.",
      });

      await fetchAssignments();
    } catch (err) {
      console.error('Error deleting assignment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove assignment';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const assignToExecutiveBoard = async (moduleName: string, permissions: string[] = ['view']) => {
    return createAssignment({
      module_name: moduleName,
      assignment_type: 'group',
      assigned_to_group: 'executive_board',
      permissions,
      notes: 'Assigned to all executive board members',
    });
  };

  const assignToIndividual = async (
    moduleName: string, 
    userId: string, 
    permissions: string[] = ['view'],
    expiresAt?: string
  ) => {
    return createAssignment({
      module_name: moduleName,
      assignment_type: 'individual',
      assigned_to_user_id: userId,
      permissions,
      expires_at: expiresAt,
    });
  };

  const assignToGroup = async (
    moduleName: string, 
    groupName: string, 
    permissions: string[] = ['view']
  ) => {
    return createAssignment({
      module_name: moduleName,
      assignment_type: 'group',
      assigned_to_group: groupName,
      permissions,
    });
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  return {
    assignments,
    loading,
    error,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    assignToExecutiveBoard,
    assignToIndividual,
    assignToGroup,
    refetch: fetchAssignments,
  };
};