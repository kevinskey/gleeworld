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
  BookOpen,
  QrCode
} from 'lucide-react';
import { TakeAttendance } from './TakeAttendance';
import { MyAttendance } from './MyAttendance';
import { AttendanceReports } from './AttendanceReports';
import { QRAttendanceGenerator } from './QRAttendanceGenerator';
import { ExcuseGenerator } from './ExcuseGenerator';
import { ExcuseRequestManager } from './ExcuseRequestManager';
import { ExcuseRequestApproval } from './ExcuseRequestApproval';
import { MyExcuseRequests } from './MyExcuseRequests';
import ClassScheduleManager from './ClassScheduleManager';
import ScheduleAnalytics from './ScheduleAnalytics';
import { CSVUploadDialog } from './CSVUploadDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { QuickActionsSection } from '@/components/user-dashboard/sections/QuickActionsSection';

export const AttendanceDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState('overview');
  const [canTakeAttendance, setCanTakeAttendance] = useState(false);
  const [userSectionCollapsed, setUserSectionCollapsed] = useState(false);
  const [classScheduleCollapsed, setClassScheduleCollapsed] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [gwProfile, setGwProfile] = useState<any>(null);
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

  const isAdmin = gwProfile?.is_admin || gwProfile?.is_super_admin || gwProfile?.is_exec_board || gwProfile?.role === 'admin' || gwProfile?.role === 'super-admin';

  // Check if user can take attendance (all executive board members or super-admin)
  const checkAttendancePermissions = useCallback(async () => {
    if (!user) {
      setCanTakeAttendance(false);
      return;
    }

    try {
      const { data: fetchedGwProfile, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, is_exec_board, exec_board_role, special_roles, role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Store the profile for use in isAdmin check
      setGwProfile(fetchedGwProfile);

      // Check if user is super-admin, any executive board member, or has secretary designation
      const isSuperAdmin = fetchedGwProfile?.is_super_admin;
      const isExecBoard = fetchedGwProfile?.is_exec_board;
      const isSecretary = fetchedGwProfile?.exec_board_role?.toLowerCase() === 'secretary';
      const hasSecretaryRole = fetchedGwProfile?.special_roles?.includes('secretary');
      
      setCanTakeAttendance(isSuperAdmin || isExecBoard || isSecretary || hasSecretaryRole);
      
      // Collapse personal attendance section by default for admins only
      const isAdminLike = isSuperAdmin || fetchedGwProfile?.is_admin || fetchedGwProfile?.role === 'admin' || fetchedGwProfile?.role === 'super-admin';
      if (isAdminLike) {
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
      
      // Get real attendance data from the database
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('status, user_id, event_id')
        .eq('user_id', user.id);

      if (attendanceError) throw attendanceError;

      // Calculate stats from real data
      const myAttendanceCount = attendanceData?.filter(a => a.status === 'present').length || 0;
      const totalUserEvents = attendanceData?.length || 0;
      const myAttendanceRate = totalUserEvents > 0 ? Math.round((myAttendanceCount / totalUserEvents) * 100) : 0;

      // Get overall statistics for admins
      if (isAdmin) {
        const { data: allAttendance, error: allAttendanceError } = await supabase
          .from('attendance')
          .select('status, user_id, event_id');

        if (!allAttendanceError && allAttendance) {
          const totalEvents = [...new Set(allAttendance.map(a => a.event_id))].length;
          const totalMembers = [...new Set(allAttendance.map(a => a.user_id))].length;
          const presentRecords = allAttendance.filter(a => a.status === 'present').length;
          const averageAttendance = allAttendance.length > 0 ? Math.round((presentRecords / allAttendance.length) * 100) : 0;

          setStats({
            myAttendance: myAttendanceRate,
            eventsThisWeek: 0, // TODO: Calculate based on current week
            pendingExcuses: 0, // TODO: Get from excuse requests
            sectionAverage: averageAttendance,
            totalEvents,
            averageAttendance,
            totalMembers,
            perfectAttendees: 0 // TODO: Calculate perfect attendance
          });
        } else {
          setStats(prev => ({
            ...prev,
            myAttendance: myAttendanceRate,
            eventsThisWeek: 0,
            pendingExcuses: 0,
            sectionAverage: 0
          }));
        }
      } else {
        setStats(prev => ({
          ...prev,
          myAttendance: myAttendanceRate,
          eventsThisWeek: 0,
          pendingExcuses: 0,
          sectionAverage: 0
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Set default values on error
      setStats(prev => ({
        ...prev,
        myAttendance: 0,
        eventsThisWeek: 0,
        pendingExcuses: 0,
        sectionAverage: 0,
        totalEvents: 0,
        averageAttendance: 0,
        totalMembers: 0,
        perfectAttendees: 0
      }));
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, start_date')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(20);
      
      if (error) throw error;
      setUpcomingEvents(data || []);
    } catch (error) {
      console.error('Error loading upcoming events:', error);
    }
  };

  useEffect(() => {
    checkAttendancePermissions();
    if (user) {
      loadDashboardStats();
      loadUpcomingEvents();
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
      <div className="bg-background/50 backdrop-blur-sm rounded-xl border">
        {/* Collapsible Header - Only for Admins */}
        {isAdmin && (
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50">
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

        {/* Content */}
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
        </div>
      </div>

      {/* Class Schedule Manager - Separate Collapsible Section */}
      <div className="bg-background/50 backdrop-blur-sm rounded-xl border">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Class Schedule Manager</span>
          </h2>
        </div>
        <div className="p-3 sm:p-6">
          <ClassScheduleManager />
        </div>
      </div>

      {/* Admin/Secretary Attendance Management - Bottom Section */}
      {canTakeAttendance && (
        <div className="space-y-4">
          {/* QR Code Generator */}
          <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-xl p-4 sm:p-6 border shadow-lg">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-primary-foreground">
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">QR Attendance Generator</span>
              <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                {isAdmin ? 'Admin' : 'Secretary'}
              </Badge>
            </h2>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
              <QRAttendanceGenerator />
            </div>
          </div>

          {/* Manual Attendance */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-xl p-4 sm:p-6 border shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-primary-foreground">
                <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Manual Attendance</span>
                <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  {isAdmin ? 'Admin' : 'Secretary'}
                </Badge>
              </h2>
              <CSVUploadDialog 
                events={upcomingEvents} 
                onUploadComplete={() => {
                  loadDashboardStats();
                  loadUpcomingEvents();
                }}
              />
            </div>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
              <TakeAttendance />
            </div>
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
        <div className="bg-background/50 backdrop-blur-sm rounded-xl p-3 sm:p-6 border">
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
        <div className="bg-background/50 backdrop-blur-sm rounded-xl p-3 sm:p-6 border">
          <ScheduleAnalytics />
        </div>
      )}
    </div>
  );
};