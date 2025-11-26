import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current user can manage group members
 * Allows: Admins, Super Admins, and Chief of Staff
 */
export const useCanManageGroupMembers = () => {
  const { user } = useAuth();
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.id) {
        setCanManage(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin or super admin
        const { data: profile, error: profileError } = await supabase
          .from('gw_profiles')
          .select('is_admin, is_super_admin')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        // If admin or super admin, they can manage
        if (profile?.is_admin || profile?.is_super_admin) {
          setCanManage(true);
          setLoading(false);
          return;
        }

        // Check if user has Chief of Staff role
        const { data: boardMember, error: boardError } = await (supabase as any)
          .from('executive_board_members')
          .select('position')
          .eq('user_id', user.id)
          .eq('position', 'chief_of_staff')
          .eq('is_active', true)
          .maybeSingle();

        if (boardError && boardError.code !== 'PGRST116') throw boardError;

        setCanManage(!!boardMember);
      } catch (error) {
        console.error('Error checking group management permissions:', error);
        setCanManage(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [user?.id]);

  return { canManage, loading };
};
