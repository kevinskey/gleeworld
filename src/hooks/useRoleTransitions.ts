import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RoleTransition {
  id: string;
  user_id: string;
  from_role: string | null;
  to_role: string;
  transition_reason: string | null;
  changed_by: string | null;
  created_at: string;
  notes: string | null;
}

export const useRoleTransitions = () => {
  const { user } = useAuth();
  const [transitions, setTransitions] = useState<RoleTransition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransitions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_role_transitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransitions(data || []);
    } catch (error) {
      console.error('Error fetching role transitions:', error);
      toast.error('Failed to load role transitions');
    } finally {
      setLoading(false);
    }
  };

  const transitionUserRole = async (
    targetUserId: string,
    newRole: string,
    reason?: string,
    notes?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('transition_user_role', {
        target_user_id: targetUserId,
        new_role: newRole,
        reason: reason || null,
        admin_notes: notes || null
      });

      if (error) throw error;

      toast.success('User role updated successfully');
      await fetchTransitions();
      return true;
    } catch (error: any) {
      console.error('Error transitioning user role:', error);
      toast.error(error.message || 'Failed to update user role');
      return false;
    }
  };

  const promoteAuditionerToMember = async (auditionerUserId: string, auditionApplicationId: string) => {
    try {
      const { data, error } = await supabase.rpc('promote_auditioner_to_member', {
        auditioner_user_id: auditionerUserId,
        audition_application_id: auditionApplicationId
      });

      if (error) throw error;

      toast.success('Auditioner promoted to member successfully');
      await fetchTransitions();
      return true;
    } catch (error: any) {
      console.error('Error promoting auditioner:', error);
      toast.error(error.message || 'Failed to promote auditioner');
      return false;
    }
  };

  useEffect(() => {
    fetchTransitions();
  }, [user]);

  return {
    transitions,
    loading,
    transitionUserRole,
    promoteAuditionerToMember,
    refetch: fetchTransitions
  };
};