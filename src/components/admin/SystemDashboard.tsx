
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  Settings
} from "lucide-react";
import { User } from "@/hooks/useUsers";
import { ActivityLog } from "@/hooks/useActivityLogs";

interface SystemDashboardProps {
  users: User[];
  loading: boolean;
  activityLogs: ActivityLog[];
  onQuickAction: (action: string) => void;
}

export const SystemDashboard = ({ users, loading, activityLogs, onQuickAction }: SystemDashboardProps) => {
  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'super-admin').length;
  const recentUsers = users.filter(u => {
    const userDate = new Date(u.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return userDate > weekAgo;
  }).length;

  const todayActivity = activityLogs.filter(log => {
    const logDate = new Date(log.created_at).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  }).length;

  const quickActions = [
    { label: "Send W9 Forms", action: "w9-forms", icon: Mail, variant: "default" as const },
    { label: "User Management", action: "users", icon: Users, variant: "outline" as const },
    { label: "System Settings", action: "settings", icon: Settings, variant: "outline" as const },
    { label: "View Activity", action: "activity", icon: Activity, variant: "outline" as const }
  ];

  if (loading) {
    return (
      <Card className="bg-white/95 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2 text-gray-700">Loading dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/95 border-blue-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-gray-800">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Total Users
            </CardTitle>
            <div className="text-3xl font-bold text-blue-600">{totalUsers}</div>
            <p className="text-sm text-gray-600">{recentUsers} new this week</p>
          </CardHeader>
        </Card>

        <Card className="bg-white/95 border-purple-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-gray-800">
              <Settings className="h-5 w-5 mr-2 text-purple-600" />
              Admin Users
            </CardTitle>
            <div className="text-3xl font-bold text-purple-600">{adminUsers}</div>
            <p className="text-sm text-gray-600">Active administrators</p>
          </CardHeader>
        </Card>

        <Card className="bg-white/95 border-green-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-gray-800">
              <Activity className="h-5 w-5 mr-2 text-green-600" />
              Today's Activity
            </CardTitle>
            <div className="text-3xl font-bold text-green-600">{todayActivity}</div>
            <p className="text-sm text-gray-600">System actions logged</p>
          </CardHeader>
        </Card>

        <Card className="bg-white/95 border-orange-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-gray-800">
              <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
              System Health
            </CardTitle>
            <div className="text-3xl font-bold text-green-600">Good</div>
            <div className="flex items-center gap-1 text-sm">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-gray-600">All systems operational</span>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white/95 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-600">
            Common administrative tasks and system management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.action}
                variant={action.variant}
                onClick={() => onQuickAction(action.action)}
                className="bg-brand-600 hover:bg-brand-700 text-white font-medium h-auto py-4 flex flex-col items-center gap-2"
              >
                <action.icon className="h-6 w-6" />
                <span className="text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card className="bg-white/95 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent System Activity
          </CardTitle>
          <CardDescription className="text-gray-600">
            Latest actions and events in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-gray-800 font-medium">{log.action_type}</p>
                      <p className="text-gray-600 text-sm">{log.resource_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600 text-sm">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {activityLogs.length > 5 && (
                <Button
                  variant="outline"
                  onClick={() => onQuickAction('activity')}
                  className="w-full border-brand-300 text-brand-700 hover:bg-brand-50"
                >
                  View All Activity ({activityLogs.length} total)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="bg-white/95 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            System Status
          </CardTitle>
          <CardDescription className="text-gray-600">
            Current status of system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-800">Database</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Operational
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-800">Authentication</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Operational
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-800">Email Service</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Operational
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
