
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsers } from "@/hooks/useUsers";
import { AdminSummaryStats } from "@/components/admin/AdminSummaryStats";
import { UserManagement } from "@/components/admin/UserManagement";
import { ActivityLogs } from "@/components/admin/ActivityLogs";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { UserImport } from "@/components/admin/UserImport";

interface ActivityLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  document: string;
  ip: string;
  status: "success" | "error" | "warning";
}

export const AdminPanel = () => {
  const [activityLogs] = useState<ActivityLog[]>([]);
  const { users, loading, error, refetch } = useUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <p className="text-gray-600">Monitor system activity and manage users</p>
      </div>

      <AdminSummaryStats users={users} loading={loading} activityLogs={activityLogs} />

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="import">Import Users</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserManagement users={users} loading={loading} error={error} onRefetch={refetch} />
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <UserImport />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityLogs activityLogs={activityLogs} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
