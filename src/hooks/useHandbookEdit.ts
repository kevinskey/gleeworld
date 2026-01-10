import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HandbookEditLog {
  id: string;
  section_id: string;
  section_title: string;
  previous_content: string | null;
  new_content: string;
  edit_summary: string | null;
  edited_by: string;
  editor_name: string | null;
  editor_role: string | null;
  created_at: string;
}

export const useHandbookEdit = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editLogs, setEditLogs] = useState<HandbookEditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Check if user can edit handbook (exec-board or admin)
  const checkEditPermission = useCallback(async () => {
    if (!user) {
      setCanEdit(false);
      setLoading(false);
      return;
    }

    try {
      // Check app_roles for admin/super-admin
      const { data: appRoles, error: appError } = await supabase
        .from('app_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('role', ['admin', 'super_admin', 'executive_board']);

      if (!appError && appRoles && appRoles.length > 0) {
        setCanEdit(true);
        setLoading(false);
        return;
      }

      // Check executive board membership
      const { data: execBoard, error: execError } = await supabase
        .from('gw_executive_board_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (!execError && execBoard && execBoard.length > 0) {
        setCanEdit(true);
        setLoading(false);
        return;
      }

      setCanEdit(false);
    } catch (error) {
      console.error('Error checking edit permission:', error);
      setCanEdit(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkEditPermission();
  }, [checkEditPermission]);

  // Fetch edit logs
  const fetchEditLogs = useCallback(async () => {
    if (!canEdit) return;
    
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('handbook_edit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEditLogs(data || []);
    } catch (error) {
      console.error('Error fetching edit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load edit history",
        variant: "destructive"
      });
    } finally {
      setLogsLoading(false);
    }
  }, [canEdit, toast]);

  // Log an edit
  const logEdit = useCallback(async (
    sectionId: string,
    sectionTitle: string,
    previousContent: string | null,
    newContent: string,
    editSummary?: string
  ) => {
    if (!user) return false;

    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Get user role
      const { data: appRole } = await supabase
        .from('app_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      let editorRole = appRole?.role || null;
      
      // If no app_role, check if exec board member
      if (!editorRole) {
        const { data: execMember } = await supabase
          .from('gw_executive_board_members')
          .select('position')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();
        
        if (execMember) {
          editorRole = `exec-board (${execMember.position})`;
        }
      }

      const { error } = await supabase
        .from('handbook_edit_logs')
        .insert({
          section_id: sectionId,
          section_title: sectionTitle,
          previous_content: previousContent,
          new_content: newContent,
          edit_summary: editSummary || null,
          edited_by: user.id,
          editor_name: profile?.full_name || user.email || 'Unknown',
          editor_role: editorRole
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error logging edit:', error);
      return false;
    }
  }, [user]);

  return {
    canEdit,
    loading,
    editLogs,
    logsLoading,
    fetchEditLogs,
    logEdit,
    refreshPermission: checkEditPermission
  };
};
