import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { AnnouncementsEventsSection } from "@/components/user-dashboard/sections/AnnouncementsEventsSection";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  CheckCircle, 
  DollarSign, 
  Bell, 
  Music, 
  BookOpen,
  Clock,
  Award,
  Users,
  TrendingUp,
  Settings,
  Star,
  Shield,
  Database,
  BarChart3,
  FileText,
  AlertCircle,
  Crown,
  Server,
  Activity,
  Lock,
  GraduationCap
} from "lucide-react";

const CalendarViewsLazy = lazy(() => import("@/components/calendar/CalendarViews").then(m => ({ default: m.CalendarViews })));


interface SuperAdminDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

export const SuperAdminDashboard = ({ user }: SuperAdminDashboardProps) => {
  console.log('SuperAdminDashboard: Component loaded with user:', user);
  const navigate = useNavigate();
  const { events: upcomingEvents } = usePublicGleeWorldEvents();
  
  // Format events for AnnouncementsEventsSection
  const formattedUpcomingEvents = upcomingEvents
    .filter(event => {
      // Filter out events with invalid dates
      const isValidDate = event.start_date && !isNaN(new Date(event.start_date).getTime());
      if (!isValidDate) {
        console.warn('Invalid date found in event:', event.id, event.start_date);
      }
      return isValidDate;
    })
    .slice(0, 6)
    .map(event => ({
      id: event.id,
      title: event.title,
      date: event.start_date,
      location: event.location || event.venue_name || undefined,
      type: event.event_type || undefined
    }));
  
  const [superAdminData, setSuperAdminData] = useState({
    systemOverview: {
      totalUsers: 0,
      activeUsers: 0,
      systemUptime: 99.9,
      totalStorage: 500,
      usedStorage: 0
    },
    securityMetrics: {
      activeLogins: 0,
      failedLoginAttempts: 0,
      suspiciousActivity: 0,
      lastSecurityAudit: '2024-01-15'
    },
    administrativeStats: {
      totalAdmins: 0,
      superAdmins: 0,
      pendingPermissions: 0,
      systemAlerts: 0
    },
    globalMetrics: {
      totalEvents: 0,
      totalContracts: 0,
      totalRevenue: 0,
      membershipGrowth: 0
    },
    criticalTasks: [],
    recentActions: []
  });

  const [calendarCollapsed, setCalendarCollapsed] = useState(true);

  useEffect(() => {
    const fetchSuperAdminData = async () => {
      try {
        // Fetch user statistics
        const { count: totalUsers } = await supabase
          .from('gw_profiles')
          .select('*', { count: 'exact', head: true });

        const { count: activeUsers } = await supabase
          .from('gw_profiles')
          .select('*', { count: 'exact', head: true })
          .not('last_sign_in_at', 'is', null);

        const { count: totalAdmins } = await supabase
          .from('gw_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_admin', true);

        const { count: superAdmins } = await supabase
          .from('gw_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_super_admin', true);

        // Fetch global metrics
        const { count: totalEvents } = await supabase
          .from('gw_events')
          .select('*', { count: 'exact', head: true });

        const { count: totalContracts } = await supabase
          .from('contracts_v2')
          .select('*', { count: 'exact', head: true });

        // Fetch security events
        const { data: securityEvents } = await supabase
          .from('gw_security_audit_log')
          .select('action_type, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        const failedLogins = securityEvents?.filter(e => 
          e.action_type.includes('failed') || e.action_type.includes('unauthorized')
        ).length || 0;

        // Fetch recent admin actions
        const { data: adminActions } = await supabase
          .from('activity_logs')
          .select('action_type, created_at, user_id')
          .in('action_type', ['role_changed', 'user_created', 'user_deleted', 'admin_action'])
          .order('created_at', { ascending: false })
          .limit(5);

        setSuperAdminData(prev => ({
          ...prev,
          systemOverview: {
            ...prev.systemOverview,
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            usedStorage: Math.round((totalUsers || 0) * 0.5), // Rough calculation
          },
          securityMetrics: {
            ...prev.securityMetrics,
            activeLogins: activeUsers || 0,
            failedLoginAttempts: failedLogins,
          },
          administrativeStats: {
            ...prev.administrativeStats,
            totalAdmins: totalAdmins || 0,
            superAdmins: superAdmins || 0,
          },
          globalMetrics: {
            ...prev.globalMetrics,
            totalEvents: totalEvents || 0,
            totalContracts: totalContracts || 0,
            membershipGrowth: 12.5, // TODO: Calculate real growth
          },
          recentActions: adminActions?.map((action, index) => ({
            id: String(index + 1),
            action: action.action_type.replace('_', ' '),
            target: 'User',
            timestamp: new Date(action.created_at).toLocaleString(),
            type: 'system'
          })) || []
        }));
      } catch (error) {
        console.error('Error fetching super admin data:', error);
      }
    };

    fetchSuperAdminData();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* System Overview Card */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Overview</CardTitle>
          <Crown className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{superAdminData.systemOverview.systemUptime}%</div>
          <p className="text-xs text-muted-foreground">System uptime</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Total Users</span>
              <span>{superAdminData.systemOverview.totalUsers}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Active Now</span>
              <span>{superAdminData.systemOverview.activeUsers}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Metrics Card */}
      <Card className="border-2 border-red-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Security Metrics</CardTitle>
          <Shield className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{superAdminData.securityMetrics.suspiciousActivity}</div>
          <p className="text-xs text-muted-foreground">Suspicious activities</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Active Logins</span>
              <span>{superAdminData.securityMetrics.activeLogins}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Failed Attempts</span>
              <span>{superAdminData.securityMetrics.failedLoginAttempts}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Administrative Stats Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Administrative Stats</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{superAdminData.administrativeStats.totalAdmins}</div>
          <p className="text-xs text-muted-foreground">Total administrators</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Super Admins</span>
              <span>{superAdminData.administrativeStats.superAdmins}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Pending Permissions</span>
              <span>{superAdminData.administrativeStats.pendingPermissions}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{superAdminData.systemOverview.usedStorage}GB</div>
          <p className="text-xs text-muted-foreground">
            of {superAdminData.systemOverview.totalStorage}GB used
          </p>
          <Progress 
            value={(superAdminData.systemOverview.usedStorage / superAdminData.systemOverview.totalStorage) * 100} 
            className="mt-2" 
          />
        </CardContent>
      </Card>

      {/* Global Metrics Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Global Metrics</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{superAdminData.globalMetrics.membershipGrowth}%</div>
          <p className="text-xs text-muted-foreground">Membership growth</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Total Events</span>
              <span>{superAdminData.globalMetrics.totalEvents}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Total Revenue</span>
              <span>${superAdminData.globalMetrics.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Tasks Card */}
      <Card className="border-2 border-yellow-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Tasks</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{superAdminData.criticalTasks.length}</div>
          <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          <div className="mt-2 space-y-2">
            {superAdminData.criticalTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-xs">
                <span className="font-medium truncate">{task.title}</span>
                <Badge variant={task.priority === 'critical' ? 'destructive' : 'secondary'}>
                  {task.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Super Admin Actions Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent Super Admin Actions</CardTitle>
          <CardDescription>Latest system-level administrative actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {superAdminData.recentActions.map((action) => (
              <div key={action.id} className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-purple-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{action.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.target} • {action.timestamp}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {action.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Administration Tools Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Admin Tools</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start" 
              onClick={() => navigate('/admin/alumnae')}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Alumnae Portal Admin
            </Button>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>User Role Management</span>
                <Badge variant="outline">Full Control</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>System Configuration</span>
                <Badge variant="outline">Admin</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Database Access</span>
                <Badge variant="outline">Super Admin</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Security Settings</span>
                <Badge variant="outline">Full Access</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Hub & Announcements Section */}
      <div className="md:col-span-2 lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CommunityHubWidget />
          <AnnouncementsEventsSection upcomingEvents={formattedUpcomingEvents} />
        </div>
        {/* Unified Calendar for Super Admins (collapsed by default) */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-base">Glee Calendar</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              aria-controls="superadmin-glee-calendar"
              aria-expanded={!calendarCollapsed}
              onClick={() => setCalendarCollapsed((v) => !v)}
            >
              {calendarCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          </div>
          {!calendarCollapsed && (
            <Suspense fallback={
              <Card className="glass-dashboard-card">
                <CardHeader>
                  <CardTitle>Glee Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="py-6">Loading calendar…</div>
                </CardContent>
              </Card>
            }>
              <div id="superadmin-glee-calendar">
                <CalendarViewsLazy />
              </div>
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};