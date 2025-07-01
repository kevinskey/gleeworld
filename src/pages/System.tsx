
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AdminPanel } from "@/components/AdminPanel";
import { SystemDashboard } from "@/components/admin/SystemDashboard";
import { UserManagement } from "@/components/admin/UserManagement";
import { PaymentManagement } from "@/components/admin/PaymentManagement";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, DollarSign, BarChart3 } from "lucide-react";
import { useState } from "react";
import { BulkW9EmailDialog } from "@/components/admin/BulkW9EmailDialog";

const System = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { users, loading, error, refetch } = useUsers();
  const { logs: activityLogs } = useActivityLogs();
  const [bulkW9EmailOpen, setBulkW9EmailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Check if user is admin or super-admin
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin';

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'w9-forms':
        setBulkW9EmailOpen(true);
        break;
      case 'users':
        setActiveTab('users');
        break;
      case 'settings':
        setActiveTab('admin');
        break;
      case 'activity':
        setActiveTab('admin');
        break;
      default:
        break;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900">
      <div className="container mx-auto px-4 py-4">
        <div className="glass-card p-4 mb-4">
          <h1 className="text-2xl font-bold text-white mb-1">System Administration</h1>
          <p className="text-base text-white/70">Comprehensive system management and monitoring</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="glass border-spelman-400/30">
            <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-spelman-500/30">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="admin" className="text-white data-[state=active]:bg-spelman-500/30">
              <Shield className="h-4 w-4 mr-2" />
              Admin Panel
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-spelman-500/30">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-white data-[state=active]:bg-spelman-500/30">
              <DollarSign className="h-4 w-4 mr-2" />
              Payment Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SystemDashboard
              users={users}
              loading={loading}
              activityLogs={activityLogs}
              onQuickAction={handleQuickAction}
            />
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement 
              users={users}
              loading={loading}
              error={error}
              onRefetch={refetch}
            />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>
        </Tabs>

        <BulkW9EmailDialog
          open={bulkW9EmailOpen}
          onOpenChange={setBulkW9EmailOpen}
          totalUsers={users.length}
        />
      </div>
    </div>
  );
};

export default System;
