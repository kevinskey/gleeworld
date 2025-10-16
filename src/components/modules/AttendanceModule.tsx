import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { MyAttendance } from '@/components/attendance/MyAttendance';
import { ModuleProps } from '@/types/unified-modules';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export const AttendanceModule = ({ user, isFullPage = false }: ModuleProps) => {
  const { user: authUser } = useAuth();
  const [canManageAttendance, setCanManageAttendance] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkPermissions = async () => {
      if (!authUser) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('is_admin, is_super_admin, role, exec_board_role, is_exec_board')
          .eq('user_id', authUser.id)
          .single();
        
        if (profile) {
          const hasPermission = profile.is_admin || 
                               profile.is_super_admin || 
                               profile.role === 'admin' || 
                               profile.role === 'super-admin' ||
                               profile.is_exec_board ||
                               profile.exec_board_role === 'secretary';
          setCanManageAttendance(hasPermission);
        }
      } catch (error) {
        console.error('Error checking attendance permissions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkPermissions();
  }, [authUser]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Render without ModuleWrapper when in dashboard - components have their own layouts
  return canManageAttendance ? <AttendanceDashboard /> : <MyAttendance />;
};