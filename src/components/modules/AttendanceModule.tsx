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
          .select('is_admin, is_super_admin, role, exec_board_role')
          .eq('user_id', authUser.id)
          .single();
        
        if (profile) {
          const hasPermission = profile.is_admin || 
                               profile.is_super_admin || 
                               profile.role === 'admin' || 
                               profile.role === 'super-admin' ||
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
      <ModuleWrapper
        id="attendance"
        title="Attendance"
        description="Loading..."
        icon={ClipboardCheck}
        iconColor="green"
        fullPage={isFullPage}
        defaultOpen={!!isFullPage}
        isLoading={true}
      >
        <div />
      </ModuleWrapper>
    );
  }
  
  return (
    <ModuleWrapper
      id="attendance"
      title={canManageAttendance ? "Attendance Management" : "My Attendance"}
      description={canManageAttendance 
        ? "Comprehensive attendance tracking, QR codes, excuse management, and reporting" 
        : "View your attendance records and status"}
      icon={ClipboardCheck}
      iconColor="green"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      {canManageAttendance ? <AttendanceDashboard /> : <MyAttendance />}
    </ModuleWrapper>
  );
};