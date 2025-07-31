import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  Calendar, 
  Users, 
  AlertCircle,
  BarChart3,
  UserCheck,
  FileText,
  Shield,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';
import { TakeAttendance } from './TakeAttendance';
import { MyAttendance } from './MyAttendance';
import { AttendanceReports } from './AttendanceReports';
import { ExcuseGenerator } from './ExcuseGenerator';
import { ExcuseRequestManager } from './ExcuseRequestManager';
import { ExcuseRequestApproval } from './ExcuseRequestApproval';
import { MyExcuseRequests } from './MyExcuseRequests';
import ClassScheduleManager from './ClassScheduleManager';
import ScheduleAnalytics from './ScheduleAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export const AttendanceDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState('overview');
  const [canTakeAttendance, setCanTakeAttendance] = useState(false);
  const [userSectionCollapsed, setUserSectionCollapsed] = useState(false);
  const [classScheduleCollapsed, setClassScheduleCollapsed] = useState(false);
  const [stats, setStats] = useState({
    myAttendance: 0,
    eventsThisWeek: 0,
    pendingExcuses: 0,
    sectionAverage: 0,
    totalEvents: 0,
    averageAttendance: 0,
    totalMembers: 0,
    perfectAttendees: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';

  // Check if user can take attendance (secretary, designate, or super-admin)
  const checkAttendancePermissions = useCallback(async () => {
    if (!user) {
      setCanTakeAttendance(false);
      return;
    }

    try {
      const { data: gwProfile, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, exec_board_role, special_roles')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Check if user is super-admin, secretary, or has secretary designation
      const isSuperAdmin = gwProfile?.is_super_admin;
      const isSecretary = gwProfile?.exec_board_role?.toLowerCase() === 'secretary';
      const hasSecretaryRole = gwProfile?.special_roles?.includes('secretary');
      
      setCanTakeAttendance(isSuperAdmin || isSecretary || hasSecretaryRole);
      
      // Collapse personal attendance section by default for secretaries
      if (isSecretary || hasSecretaryRole) {
        setUserSectionCollapsed(true);
      }
    } catch (error) {
      console.error('Error checking attendance permissions:', error);
      setCanTakeAttendance(false);
    }
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user) return;
    
    try {
      setStatsLoading(true);
      
      // For now, use mock data until we can access the correct tables
      // You can update these with real queries once the schema is confirmed
      setStats(prev => ({
        ...prev,
        totalEvents: 25,
        averageAttendance: 87,
        totalMembers: 42,
        perfectAttendees: 8
      }));
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    checkAttendancePermissions();
    if (user) {
      loadDashboardStats();
    }
  }, [checkAttendancePermissions, user]);

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to access attendance features.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 px-2 sm:px-4 lg:px-6">
      {/* User Sections with Admin Collapse Toggle */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl border">
        {/* Collapsible Header - Only for Admins */}
        {isAdmin && (
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200/50">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Personal Attendance</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUserSectionCollapsed(!userSectionCollapsed)}
              className="flex items-center gap-1"
            >
              {userSectionCollapsed ? (
                <>
                  <span className="text-sm">Show</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="text-sm">Hide</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Collapsible Content */}
        {!userSectionCollapsed && (
          <div className="p-3 sm:p-6 space-y-4">
            {/* My Attendance Section */}
            <div>
              {!isAdmin && (
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="truncate">My Attendance</span>
                </h2>
              )}
              <MyAttendance />
            </div>

            {/* My Excuse Requests */}
            <div className="pt-4 border-t border-gray-200/50">
              <MyExcuseRequests onEditRequest={(request) => {
                // Access the edit function exposed globally
                if ((window as any).editExcuseRequest) {
                  (window as any).editExcuseRequest(request);
                }
              }} />
            </div>

            {/* Excuse Generator */}
            <div className="pt-4 border-t border-gray-200/50">
              <ExcuseGenerator onRequestEdited={() => {
                // Reload the page or refresh the request list
                window.location.reload();
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Class Schedule Manager - Separate Collapsible Section */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl border">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200/50">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Class Schedule Manager</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClassScheduleCollapsed(!classScheduleCollapsed)}
            className="flex items-center gap-1"
          >
            {classScheduleCollapsed ? (
              <>
                <span className="text-sm">Show</span>
                <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                <span className="text-sm">Hide</span>
                <ChevronUp className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        
        {!classScheduleCollapsed && (
          <div className="p-3 sm:p-6">
            <ClassScheduleManager />
          </div>
        )}
      </div>

      {/* Admin/Secretary Attendance Management - Bottom Section */}
      {canTakeAttendance && (
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-xl p-4 sm:p-6 border shadow-lg">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-white">
            <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Take Attendance</span>
            <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
              {isAdmin ? 'Admin' : 'Secretary'}
            </Badge>
          </h2>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
            <TakeAttendance />
          </div>
        </div>
      )}

      {/* Admin Final Approval Module */}
      {isAdmin && (
        <ExcuseRequestApproval />
      )}

      {/* Secretary Workflow Management (separate from admin approval) */}
      {canTakeAttendance && !isAdmin && (
        <ExcuseRequestManager />
      )}

      {/* Admin Reports Section */}
      {isAdmin && (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 sm:p-6 border">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Attendance Reports</span>
            <Badge variant="outline" className="ml-2">
              Admin Only
            </Badge>
          </h2>
          <AttendanceReports />
        </div>
      )}

      {/* Schedule Analytics Section - Admin Only */}
      {isAdmin && (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 sm:p-6 border">
          <ScheduleAnalytics />
        </div>
      )}
    </div>
  );
};