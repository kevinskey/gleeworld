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
import { AttendanceReports } from './AttendanceReports';
import { ExcuseGenerator } from './ExcuseGenerator';
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
    <div className="space-y-4 px-2 sm:px-4 lg:px-6">
      {/* Mobile-optimized Attendance Section */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 sm:p-6 border">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="truncate">Attendance Management</span>
        </h2>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile-friendly tab list */}
          <div className="w-full overflow-x-auto">
            <TabsList className="flex w-max min-w-full h-auto p-1 bg-white/80 backdrop-blur-sm rounded-lg">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-1.5 py-2.5 px-3 sm:py-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>My Attendance</span>
              </TabsTrigger>
              
              {canTakeAttendance && (
                <TabsTrigger 
                  value="take-attendance" 
                  className="flex items-center gap-1.5 py-2.5 px-3 sm:py-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Take Attendance</span>
                </TabsTrigger>
              )}
              
              {isAdmin && (
                <TabsTrigger 
                  value="reports" 
                  className="flex items-center gap-1.5 py-2.5 px-3 sm:py-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Reports</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Tab content with mobile optimization */}
          <div className="mt-4">
            <TabsContent value="overview" className="space-y-4 m-0 animate-fade-in">
              <MyAttendance />
            </TabsContent>

            {canTakeAttendance && (
              <TabsContent value="take-attendance" className="space-y-4 m-0 animate-fade-in">
                <TakeAttendance />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="reports" className="space-y-4 m-0 animate-fade-in">
                <AttendanceReports />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

      {/* Mobile-optimized Excuse Generator */}
      <div className="mt-4">
        <ExcuseGenerator />
      </div>
    </div>
  );
};