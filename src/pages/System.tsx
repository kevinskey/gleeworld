import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SystemDashboard } from "@/components/admin/SystemDashboard";
import { UserManagement } from "@/components/admin/UserManagement";
import { PaymentManagement } from "@/components/admin/PaymentManagement";
import { W9Management } from "@/components/admin/W9Management";
import { FinancialSystem } from "@/components/admin/FinancialSystem";
import { ContractManagement } from "@/components/admin/ContractManagement";
import { FinancialOverview } from "@/components/admin/financial/FinancialOverview";
import { UserFinancialRecords } from "@/components/admin/financial/UserFinancialRecords";
import { PaymentTracking } from "@/components/admin/financial/PaymentTracking";
import { StipendManagement } from "@/components/admin/financial/StipendManagement";
import { BudgetTracking } from "@/components/admin/financial/BudgetTracking";
import { FinancialReports } from "@/components/admin/financial/FinancialReports";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Settings, 
  Users, 
  DollarSign, 
  FileText, 
  Calculator, 
  Shield, 
  ChevronDown,
  TrendingUp,
  CreditCard,
  PieChart,
  BarChart3
} from "lucide-react";

const System = () => {
  const { user } = useAuth();
  const { users, loading, error, refetch } = useUsers();
  const { logs: activityLogs } = useActivityLogs();
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'users':
        setActiveTab('users');
        break;
      case 'w9-forms':
        setActiveTab('w9');
        break;
      case 'contracts':
        setActiveTab('contracts');
        break;
      case 'financial-overview':
        setActiveTab('financial-overview');
        break;
      case 'user-records':
        setActiveTab('user-records');
        break;
      case 'payment-tracking':
        setActiveTab('payment-tracking');
        break;
      case 'stipends':
        setActiveTab('stipends');
        break;
      case 'budget':
        setActiveTab('budget');
        break;
      case 'reports':
        setActiveTab('reports');
        break;
      case 'bulk-w9':
      case 'settings':
      case 'activity':
        console.log(`Quick action: ${action}`);
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
    <UniversalLayout containerized={false}>
      <div className="container mx-auto px-4 py-3">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white mb-1">System Administration</h1>
          <p className="text-gray-300 text-sm">Comprehensive management and oversight tools</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile/Desktop Responsive Tab Layout */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-1">
            <TabsList className="w-full bg-transparent p-0 h-auto flex-wrap gap-1 justify-start lg:grid lg:grid-cols-7">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white text-xs px-2 py-2 rounded"
              >
                <Settings className="h-3 w-3" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="users" 
                className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white text-xs px-2 py-2 rounded"
              >
                <Users className="h-3 w-3" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>

              <TabsTrigger 
                value="contracts" 
                className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white text-xs px-2 py-2 rounded"
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Contracts</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="payments" 
                className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white text-xs px-2 py-2 rounded"
              >
                <DollarSign className="h-3 w-3" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="w9" 
                className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white text-xs px-2 py-2 rounded"
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">W9 Forms</span>
              </TabsTrigger>

              {/* Financial Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`flex items-center gap-1 text-white/70 hover:text-white hover:bg-white/10 text-xs px-2 py-2 h-auto rounded ${
                      ['financial-overview', 'user-records', 'payment-tracking', 'stipends', 'budget', 'reports'].includes(activeTab) 
                        ? 'bg-white/20 text-white' 
                        : ''
                    }`}
                  >
                    <Calculator className="h-3 w-3" />
                    <span className="hidden sm:inline">Financial</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
                  <DropdownMenuItem onClick={() => setActiveTab('financial-overview')}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Overview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('user-records')}>
                    <FileText className="h-4 w-4 mr-2" />
                    User Records
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('payment-tracking')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payment Tracking
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab('stipends')}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Stipends
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('budget')}>
                    <PieChart className="h-4 w-4 mr-2" />
                    Budget
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('reports')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Reports
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* System Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-1 text-white/70 hover:text-white hover:bg-white/10 text-xs px-2 py-2 h-auto rounded"
                  >
                    <Settings className="h-3 w-3" />
                    <span className="hidden sm:inline">Tools</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
                  <DropdownMenuItem onClick={() => console.log('System settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    System Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('Activity logs')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Activity Logs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => console.log('Bulk actions')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Bulk Actions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TabsList>
          </div>

          {/* Tab Content */}
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

          <TabsContent value="contracts" className="space-y-4">
            <ContractManagement />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentManagement />
          </TabsContent>

          <TabsContent value="w9" className="space-y-4">
            <W9Management />
          </TabsContent>

          {/* Financial System Tabs */}
          <TabsContent value="financial-overview" className="space-y-4">
            <FinancialOverview />
          </TabsContent>

          <TabsContent value="user-records" className="space-y-4">
            <UserFinancialRecords />
          </TabsContent>

          <TabsContent value="payment-tracking" className="space-y-4">
            <PaymentTracking />
          </TabsContent>

          <TabsContent value="stipends" className="space-y-4">
            <StipendManagement />
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <BudgetTracking />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <FinancialReports />
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};

export default System;
