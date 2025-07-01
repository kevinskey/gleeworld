import { AdminSummaryStats } from "./AdminSummaryStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Settings, Activity, BarChart3, Mail } from "lucide-react";
import { User } from "@/hooks/useUsers";
import { ActivityLog } from "@/hooks/useActivityLogs";

interface SystemDashboardProps {
  users: User[];
  loading: boolean;
  activityLogs: ActivityLog[];
  onQuickAction: (action: string) => void;
}

export const SystemDashboard = ({ users, loading, activityLogs, onQuickAction }: SystemDashboardProps) => {
  const quickActions = [
    {
      id: 'users',
      label: 'Manage Users',
      description: 'View and manage user accounts',
      icon: Users,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'contracts',
      label: 'View Contracts',
      description: 'Manage all system contracts',
      icon: FileText,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'w9-forms',
      label: 'W9 Management',
      description: 'Review and approve W9 forms',
      icon: FileText,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'bulk-w9',
      label: 'Send W9 Forms',
      description: 'Send W9 forms to users',
      icon: Mail,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      id: 'settings',
      label: 'System Settings',
      description: 'Configure system preferences',
      icon: Settings,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      id: 'activity',
      label: 'Activity Logs',
      description: 'View system activity',
      icon: Activity,
      color: 'bg-red-500 hover:bg-red-600'
    }
  ];

  return (
    <div className="space-y-4">
      <AdminSummaryStats 
        users={users}
        loading={loading}
        activityLogs={activityLogs}
      />
      
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-white/70">
            Common administrative tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className={`h-auto p-4 flex flex-col items-start gap-2 text-white border-white/20 hover:border-white/40 ${action.color} border-0`}
                  onClick={() => onQuickAction(action.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <span className="text-sm text-white/80 text-left">
                    {action.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
