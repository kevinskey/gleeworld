import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
  GraduationCap
} from "lucide-react";

interface AdminDashboardProps {
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

export const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  // Mock data for admin dashboard
  const adminData = {
    systemStats: {
      totalUsers: 124,
      activeUsers: 89,
      pendingTasks: 15,
      systemHealth: 98
    },
    userMetrics: {
      newRegistrations: 12,
      totalMembers: 89,
      alumnaeMembersCount: 35,
      attendanceRate: 87
    },
    upcomingEvents: [
      {
        id: '1',
        title: 'Admin Review Meeting',
        date: '2024-01-19',
        time: '3:00 PM',
        location: 'Admin Office'
      },
      {
        id: '2',
        title: 'System Maintenance',
        date: '2024-01-21',
        time: '12:00 AM',
        location: 'Remote'
      }
    ],
    pendingApprovals: [
      {
        id: '1',
        type: 'Event Request',
        title: 'Spring Concert Venue Booking',
        requester: 'Event Planning Team',
        priority: 'high'
      },
      {
        id: '2',
        type: 'Budget Request',
        title: 'Equipment Purchase',
        requester: 'Music Director',
        priority: 'medium'
      }
    ],
    recentActivity: [
      {
        id: '1',
        action: 'User Role Updated',
        target: 'Sarah Johnson',
        timestamp: '2024-01-18 14:30'
      },
      {
        id: '2',
        action: 'System Backup Completed',
        target: 'Database',
        timestamp: '2024-01-18 02:00'
      }
    ],
    financialOverview: {
      totalBudget: 25000,
      allocated: 18500,
      spent: 12300,
      remaining: 12700
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* System Health Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{adminData.systemStats.systemHealth}%</div>
          <p className="text-xs text-muted-foreground">All systems operational</p>
          <Progress value={adminData.systemStats.systemHealth} className="mt-2" />
        </CardContent>
      </Card>

      {/* User Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">User Management</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{adminData.systemStats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            Total users ({adminData.systemStats.activeUsers} active)
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Active</span>
              <span>{adminData.systemStats.activeUsers}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>New (This Month)</span>
              <span>{adminData.userMetrics.newRegistrations}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{adminData.pendingApprovals.length}</div>
          <p className="text-xs text-muted-foreground">Items need review</p>
          <div className="mt-2 space-y-2">
            {adminData.pendingApprovals.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between text-xs">
                <span className="font-medium truncate">{approval.type}</span>
                <Badge variant={approval.priority === 'high' ? 'destructive' : 'secondary'}>
                  {approval.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Financial Overview</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${adminData.financialOverview.remaining.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Remaining budget</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Total Budget</span>
              <span>${adminData.financialOverview.totalBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Spent</span>
              <span>${adminData.financialOverview.spent.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Analytics Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Analytics</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{adminData.userMetrics.attendanceRate}%</div>
          <p className="text-xs text-muted-foreground">Overall attendance rate</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Active Members</span>
              <span>{adminData.userMetrics.totalMembers}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Alumnae</span>
              <span>{adminData.userMetrics.alumnaeMembersCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Tools Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Admin Tools</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>User Management</span>
              <Badge variant="outline">Full Access</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>System Settings</span>
              <Badge variant="outline">Admin</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Analytics</span>
              <Badge variant="outline">View All</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent System Activity Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest administrative actions and system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminData.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.target} • {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start" 
              onClick={() => navigate('/executive-board')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Executive Board Dashboard
            </Button>
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
                <span>Create User</span>
                <Badge variant="outline">Action</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Send Announcement</span>
                <Badge variant="outline">Action</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Generate Report</span>
                <Badge variant="outline">Action</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};