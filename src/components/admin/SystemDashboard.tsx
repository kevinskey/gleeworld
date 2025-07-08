
import { AdminSummaryStats } from "./AdminSummaryStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  Settings, 
  BarChart3, 
  DollarSign,
  PieChart,
  Calculator,
  UserPlus,
  Plus
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
  const quickActions = [
    {
      id: 'create-contract',
      label: 'Create Contract',
      description: 'Create a new contract',
      icon: FileText,
      color: 'bg-primary text-primary-foreground hover:bg-primary/90'
    },
    {
      id: 'add-user',
      label: 'Add User',
      description: 'Add a new user to the system',
      icon: UserPlus,
      color: 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
    },
    {
      id: 'add-budget',
      label: 'Add Budget',
      description: 'Create a new budget',
      icon: PieChart,
      color: 'bg-primary text-primary-foreground hover:bg-primary/90'
    },
    {
      id: 'pay-user',
      label: 'Pay User',
      description: 'Process user payment',
      icon: DollarSign,
      color: 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
    },
    {
      id: 'run-report',
      label: 'Run Report',
      description: 'Generate system reports',
      icon: BarChart3,
      color: 'bg-primary text-primary-foreground hover:bg-primary/90'
    },
    {
      id: 'system',
      label: 'System',
      description: 'System configuration',
      icon: Settings,
      color: 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
    }
  ];

  return (
    <div className="space-y-6">
      <AdminSummaryStats 
        users={users}
        loading={loading}
        activityLogs={activityLogs}
      />
      
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Calculator className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-600">
            Common administrative tasks and financial management shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className={`h-auto p-3 flex flex-col items-start gap-2 border-0 ${action.color} hover:shadow-md transition-all text-left`}
                  onClick={() => onQuickAction(action.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium text-sm">{action.label}</span>
                  </div>
                  <span className="text-xs opacity-90 text-left leading-tight">
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
