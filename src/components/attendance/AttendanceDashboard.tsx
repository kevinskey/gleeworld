import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Award
} from 'lucide-react';
import { TakeAttendance } from './TakeAttendance';
import { MyAttendance } from './MyAttendance';
import { ExcuseRequests } from './ExcuseRequests';
import { AttendanceReports } from './AttendanceReports';
import { PreEventExcuses } from './PreEventExcuses';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export const AttendanceDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState('overview');
  const [canTakeAttendance, setCanTakeAttendance] = useState(false);
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
    <div className="space-y-8">
      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{statsLoading ? '...' : stats.totalEvents}</div>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{statsLoading ? '...' : `${stats.averageAttendance}%`}</div>
                <p className="text-xs text-muted-foreground">Average Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{statsLoading ? '...' : stats.totalMembers}</div>
                <p className="text-xs text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{statsLoading ? '...' : stats.perfectAttendees}</div>
                <p className="text-xs text-muted-foreground">Perfect Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Attendance Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">My Attendance</CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {statsLoading ? '...' : `${stats.myAttendance}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This semester</p>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Events This Week</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {statsLoading ? '...' : stats.eventsThisWeek}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Rehearsals & Performances</p>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Pending Excuses</CardTitle>
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {statsLoading ? '...' : stats.pendingExcuses}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Section Average</CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {statsLoading ? '...' : `${stats.sectionAverage}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile?.voice_part || 'All sections'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-1 border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-white/80 backdrop-blur-sm">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">My Attendance</span>
              <span className="sm:hidden">Attendance</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="pre-excuses" 
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Pre-Event Excuses</span>
              <span className="sm:hidden">Pre-Excuse</span>
            </TabsTrigger>
            
            {canTakeAttendance && (
              <TabsTrigger 
                value="take-attendance" 
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
              >
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Take Attendance</span>
                <span className="sm:hidden">Take</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger 
              value="excuses" 
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Post-Event Excuses</span>
              <span className="sm:hidden">Excuses</span>
            </TabsTrigger>
            
            {isAdmin && (
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
                <span className="sm:hidden">Reports</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="mt-8">
            <TabsContent value="overview" className="space-y-6 animate-fade-in">
              <MyAttendance />
            </TabsContent>

            <TabsContent value="pre-excuses" className="space-y-6 animate-fade-in">
              <PreEventExcuses />
            </TabsContent>

            {canTakeAttendance && (
              <TabsContent value="take-attendance" className="space-y-6 animate-fade-in">
                <TakeAttendance />
              </TabsContent>
            )}

            <TabsContent value="excuses" className="space-y-6 animate-fade-in">
              <ExcuseRequests />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="reports" className="space-y-6 animate-fade-in">
                <AttendanceReports />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};