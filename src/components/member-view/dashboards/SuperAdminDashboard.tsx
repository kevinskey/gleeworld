import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Lock
} from "lucide-react";

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
  // Mock data for super admin dashboard
  const superAdminData = {
    systemOverview: {
      totalUsers: 124,
      activeUsers: 89,
      systemUptime: 99.9,
      totalStorage: 500, // GB
      usedStorage: 287 // GB
    },
    securityMetrics: {
      activeLogins: 45,
      failedLoginAttempts: 3,
      suspiciousActivity: 0,
      lastSecurityAudit: '2024-01-15'
    },
    administrativeStats: {
      totalAdmins: 8,
      superAdmins: 2,
      pendingPermissions: 5,
      systemAlerts: 2
    },
    globalMetrics: {
      totalEvents: 156,
      totalContracts: 89,
      totalRevenue: 45000,
      membershipGrowth: 12.5
    },
    criticalTasks: [
      {
        id: '1',
        title: 'System Security Update',
        priority: 'critical',
        dueDate: '2024-01-20',
        category: 'security'
      },
      {
        id: '2',
        title: 'Database Backup Verification',
        priority: 'high',
        dueDate: '2024-01-22',
        category: 'maintenance'
      }
    ],
    recentActions: [
      {
        id: '1',
        action: 'Granted Super Admin Access',
        target: 'Dr. Rebecca Smith',
        timestamp: '2024-01-18 16:45',
        type: 'permission'
      },
      {
        id: '2',
        action: 'System Configuration Updated',
        target: 'Email Settings',
        timestamp: '2024-01-18 14:20',
        type: 'system'
      }
    ]
  };

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
        </CardContent>
      </Card>
    </div>
  );
};