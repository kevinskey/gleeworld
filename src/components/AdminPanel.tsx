
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUsers } from "@/hooks/useUsers";
import { AdminSummaryStats } from "@/components/admin/AdminSummaryStats";
import { UserManagement } from "@/components/admin/UserManagement";
import { ActivityLogs } from "@/components/admin/ActivityLogs";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { UserImport } from "@/components/admin/UserImport";

export const AdminPanel = () => {
  const { users, loading, error, refetch } = useUsers();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          <p className="text-gray-600">Monitor system activity and manage users</p>
        </div>
        <Button
          onClick={() => navigate('/activity-logs')}
          className="flex items-center space-x-2"
        >
          <Activity className="h-4 w-4" />
          <span>View All Activity</span>
        </Button>
      </div>

      <AdminSummaryStats users={users} loading={loading} activityLogs={[]} />

      <Tabs defaultValue="users" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="import">Import Users</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="w-full">
          <div className="max-w-none">
            <UserManagement users={users} loading={loading} error={error} onRefetch={refetch} />
          </div>
        </TabsContent>

        <TabsContent value="import" className="w-full">
          <div className="max-w-none">
            <UserImport />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="w-full">
          <div className="max-w-none">
            <ActivityLogs />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="w-full">
          <div className="max-w-none">
            <SystemSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
