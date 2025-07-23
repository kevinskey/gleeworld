import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemDashboard } from "@/components/admin/SystemDashboard";
import { EnhancedUserManagement } from "@/components/admin/user-management/EnhancedUserManagement";
import { ExecutiveBoardManager } from "@/components/admin/ExecutiveBoardManager";
import { AccessibilitySettings } from "@/components/settings/AccessibilitySettings";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Shield, Settings, Users, Activity, Crown } from "lucide-react";

const System = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { users, loading, error, refetch } = useUsers();
  const { logs: activityLogs } = useActivityLogs();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || "dashboard";
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'manage-users':
        setActiveTab('users');
        break;
      case 'view-logs':
        setActiveTab('activity');
        break;
      case 'executive-board':
        setActiveTab('executive-board');
        break;
      case 'system-settings':
      case 'add-user':
        setActiveTab('settings');
        break;
      default:
        break;
    }
  };

  if (!user) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-6">
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-gray-900">Authentication Required</h2>
                <p className="text-gray-600">Please sign in to access the system administration panel.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout 
      containerized={false}
      systemActiveTab={activeTab}
      onSystemTabChange={setActiveTab}
    >
      <div className="container mx-auto px-2 sm:px-4 py-3">
        {/* Content based on active tab */}
        <div className="space-y-4">
          {activeTab === "dashboard" && (
            <SystemDashboard 
              users={users}
              loading={loading}
              activityLogs={activityLogs}
              onQuickAction={handleQuickAction}
            />
          )}

          {activeTab === "users" && (
            <EnhancedUserManagement 
              users={users} 
              loading={loading} 
              error={error} 
              onRefetch={refetch}
            />
          )}

          {activeTab === "executive-board" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Executive Board Management
                </CardTitle>
                <CardDescription>
                  Assign executive board positions and manage permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExecutiveBoardManager 
                  users={users}
                  loading={loading}
                  onRefetch={refetch}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "activity" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Logs
                </CardTitle>
                <CardDescription>
                  System activity and audit trail
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Activity Logs</h3>
                  <p className="text-gray-600">Activity logging system coming soon.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Settings
                  </CardTitle>
                  <CardDescription>
                    Configure system-wide settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">System Settings</h3>
                    <p className="text-gray-600">System configuration panel coming soon.</p>
                  </div>
                </CardContent>
              </Card>
              
              <AccessibilitySettings />
            </div>
          )}
        </div>
      </div>
    </UniversalLayout>
  );
};

export default System;