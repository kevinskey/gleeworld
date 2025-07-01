
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
      <div className="min-h-screen bg-gray-50">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">System Administration</h1>
          <p className="text-gray-600 text-sm">Comprehensive management and oversight tools</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 bg-white border border-gray-200 p-1">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900"
            >
              <Settings className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900"
            >
              <DollarSign className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger 
              value="w9" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900"
            >
              <FileText className="h-4 w-4" />
              W9 Forms
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900"
            >
              <Calculator className="h-4 w-4" />
              Financial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <SystemDashboard 
              users={users}
              loading={loading}
              activityLogs={activityLogs}
              onQuickAction={handleQuickAction}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement 
              users={users} 
              loading={loading} 
              error={error} 
              onRefetch={refetch}
            />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentManagement />
          </TabsContent>

          <TabsContent value="w9" className="space-y-4">
            <W9Management />
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <FinancialSystem />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default System;
