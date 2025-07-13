
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Users, 
  FileText, 
  DollarSign, 
  Activity, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { User } from "@/hooks/useUsers";
import { ActivityLog } from "@/hooks/useActivityLogs";

interface AdminSummaryStatsProps {
  users: User[];
  loading: boolean;
  activityLogs: ActivityLog[];
}

export const AdminSummaryStats = ({ users, loading, activityLogs }: AdminSummaryStatsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  // Calculate stats
  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(user => user.email)?.length || 0; // Filter by users with email
  const totalContracts = 247; // Mock data - replace with real data
  const pendingContracts = 12;
  const totalRevenue = 45250;
  const recentActivity = activityLogs?.slice(0, 5) || [];

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      subtitle: `${activeUsers} active`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: "+12%"
    },
    {
      title: "Contracts",
      value: totalContracts,
      subtitle: `${pendingContracts} pending`,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "+5%"
    },
    {
      title: "Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      subtitle: "This month",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: "+8%"
    },
    {
      title: "Activities",
      value: activityLogs?.length || 0,
      subtitle: "Last 30 days",
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: "+23%"
    }
  ];

  if (loading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100 pb-4 cursor-pointer hover:bg-gradient-to-r hover:from-slate-100 hover:to-blue-100 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  )}
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-xl">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                    System Overview
                  </CardTitle>
                  <p className="text-gray-600 mt-1 text-sm">
                    Real-time dashboard metrics and system health
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index}
                className="relative bg-white border border-gray-100 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${stat.bgColor} mb-3`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.title}</p>
                      <p className="text-sm text-gray-600">{stat.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                      {stat.trend}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity Section */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          </div>
          
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((log, index) => (
                <div key={log.id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {log.action_type?.replace(/_/g, ' ') || 'System Activity'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.resource_type || 'General'} • {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </CollapsibleContent>
  </Card>
</Collapsible>
);
};
