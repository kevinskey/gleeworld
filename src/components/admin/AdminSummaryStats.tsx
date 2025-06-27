
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Settings, Activity, FileText } from "lucide-react";
import { User } from "@/hooks/useUsers";
import { ActivityLog } from "@/hooks/useActivityLogs";

interface AdminSummaryStatsProps {
  users: User[];
  loading: boolean;
  activityLogs: ActivityLog[];
}

export const AdminSummaryStats = ({ users, loading, activityLogs }: AdminSummaryStatsProps) => {
  const adminUsersCount = users.filter(u => u.role === "admin" || u.role === "super-admin").length;
  const todaysLogs = activityLogs.filter(log => {
    const logDate = new Date(log.created_at).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-gray-900">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Registered Users
          </CardTitle>
          <div className="text-2xl font-bold text-blue-600">
            {loading ? "..." : users.length}
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-gray-900">
            <Settings className="h-5 w-5 mr-2 text-purple-600" />
            Admin Users
          </CardTitle>
          <div className="text-2xl font-bold text-purple-600">
            {loading ? "..." : adminUsersCount}
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-gray-900">
            <Activity className="h-5 w-5 mr-2 text-green-600" />
            Today's Activity
          </CardTitle>
          <div className="text-2xl font-bold text-green-600">
            {todaysLogs.length}
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-gray-900">
            <FileText className="h-5 w-5 mr-2 text-orange-600" />
            System Health
          </CardTitle>
          <div className="text-2xl font-bold text-green-600">Good</div>
        </CardHeader>
      </Card>
    </div>
  );
};
