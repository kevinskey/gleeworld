
import { AdminSummaryStats } from "./AdminSummaryStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  Settings, 
  Activity, 
  BarChart3, 
  Mail, 
  TrendingUp,
  CreditCard,
  DollarSign,
  PieChart,
  Calculator
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
      id: 'users',
      label: 'Manage Users',
      description: 'View and manage user accounts',
      icon: Users,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'w9-forms',
      label: 'W9 Management',
      description: 'Review and approve W9 forms',
      icon: FileText,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'financial-overview',
      label: 'Financial Overview',
      description: 'View financial dashboard',
      icon: TrendingUp,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'user-records',
      label: 'User Records',
      description: 'View user financial records',
      icon: FileText,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      id: 'payment-tracking',
      label: 'Payment Tracking',
      description: 'Track and manage payments',
      icon: CreditCard,
      color: 'bg-emerald-500 hover:bg-emerald-600'
    },
    {
      id: 'stipends',
      label: 'Stipend Management',
      description: 'Manage stipend payments',
      icon: DollarSign,
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      id: 'budget',
      label: 'Budget Tracking',
      description: 'Monitor budget and expenses',
      icon: PieChart,
      color: 'bg-pink-500 hover:bg-pink-600'
    },
    {
      id: 'reports',
      label: 'Financial Reports',
      description: 'Generate financial reports',
      icon: BarChart3,
      color: 'bg-violet-500 hover:bg-violet-600'
    },
    {
      id: 'bulk-w9',
      label: 'Send W9 Forms',
      description: 'Send W9 forms to users',
      icon: Mail,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      id: 'settings',
      label: 'System Settings',
      description: 'Configure system preferences',
      icon: Settings,
      color: 'bg-gray-500 hover:bg-gray-600'
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
                  className={`h-auto p-3 flex flex-col items-start gap-2 text-white border-0 ${action.color} hover:shadow-md transition-all text-left`}
                  onClick={() => onQuickAction(action.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium text-sm">{action.label}</span>
                  </div>
                  <span className="text-xs text-white/90 text-left leading-tight">
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
