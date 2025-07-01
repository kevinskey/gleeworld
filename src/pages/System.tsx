
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemDashboard } from "@/components/admin/SystemDashboard";
import { UserManagement } from "@/components/admin/UserManagement";
import { PaymentManagement } from "@/components/admin/PaymentManagement";
import { W9Management } from "@/components/admin/W9Management";
import { FinancialSystem } from "@/components/admin/FinancialSystem";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, Users, DollarSign, FileText, Calculator, Shield } from "lucide-react";

const System = () => {
  const { user } = useAuth();
  const { users, loading, error, refetch } = useUsers();
  const { logs: activityLogs } = useActivityLogs();
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleQuickAction = (action: string) => {
    // Handle quick actions from dashboard
    switch (action) {
      case 'users':
        setActiveTab('users');
        break;
      case 'w9-forms':
        setActiveTab('w9');
        break;
      case 'contracts':
      case 'bulk-w9':
      case 'settings':
      case 'activity':
        // These could navigate to other pages or trigger modals
        console.log(`Quick action: ${action}`);
        break;
      default:
        break;
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please sign in to access the system administration panel.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">System Administration</h1>
        <p className="text-gray-600">Comprehensive management and oversight tools</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="w9" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            W9 Forms
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Financial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <SystemDashboard 
            users={users}
            loading={loading}
            activityLogs={activityLogs}
            onQuickAction={handleQuickAction}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement 
            users={users} 
            loading={loading} 
            error={error} 
            onRefetch={refetch}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentManagement />
        </TabsContent>

        <TabsContent value="w9" className="space-y-6">
          <W9Management />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialSystem />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default System;
