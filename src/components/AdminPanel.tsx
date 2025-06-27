
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "./admin/UserManagement";
import { SystemSettings } from "./admin/SystemSettings";
import { AdminSummaryStats } from "./admin/AdminSummaryStats";
import { ActivityLogs } from "./admin/ActivityLogs";
import { ContractSignatureFixer } from "./admin/ContractSignatureFixer";
import { ReceiptsManagement } from "./admin/ReceiptsManagement";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Shield, Users, Settings, FileText, Activity, Receipt } from "lucide-react";

interface AdminPanelProps {
  activeTab?: string;
}

export const AdminPanel = ({ activeTab }: AdminPanelProps) => {
  const { user } = useAuth();
  
  // Fetch users data
  const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  
  // Only fetch activity logs when the activity tab is active
  const { logs: activityLogs, loading: logsLoading } = useActivityLogs();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Please sign in to access the admin panel.</p>
      </div>
    );
  }

  // Render content based on active tab from URL or parent
  const currentPath = window.location.pathname;
  const currentTab = activeTab || 
    (currentPath.includes('users') ? 'users' : 
     currentPath.includes('activity') ? 'activity' : 
     currentPath.includes('receipts') ? 'receipts' : 
     currentPath.includes('settings') ? 'settings' : 'overview');

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <AdminSummaryStats 
            users={users}
            loading={usersLoading}
            activityLogs={activityLogs}
          />
        );
      case 'users':
        return (
          <UserManagement 
            users={users}
            loading={usersLoading}
            error={usersError}
            onRefetch={refetchUsers}
          />
        );
      case 'activity':
        return <ActivityLogs />;
      case 'contracts':
        return <ContractSignatureFixer />;
      case 'receipts':
        return <ReceiptsManagement />;
      case 'settings':
        return <SystemSettings />;
      default:
        return (
          <AdminSummaryStats 
            users={users}
            loading={usersLoading}
            activityLogs={activityLogs}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};
