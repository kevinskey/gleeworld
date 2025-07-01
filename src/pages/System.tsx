
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
          {/* Improved Tab Layout with Better Readability */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm p-2">
            <TabsList className="w-full bg-white p-1 h-auto flex-wrap gap-1 justify-start lg:grid lg:grid-cols-7 border border-gray-100 rounded-md shadow-sm">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center gap-2 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-sm px-3 py-2.5 rounded font-medium transition-all duration-200"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Dash</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="users" 
                className="flex items-center gap-2 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-sm px-3 py-2.5 rounded font-medium transition-all duration-200"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>

              <TabsTrigger 
                value="contracts" 
                className="flex items-center gap-2 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-sm px-3 py-2.5 rounded font-medium transition-all duration-200"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Contracts</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="payments" 
                className="flex items-center gap-2 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-sm px-3 py-2.5 rounded font-medium transition-all duration-200"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="w9" 
                className="flex items-center gap-2 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-sm px-3 py-2.5 rounded font-medium transition-all duration-200"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">W9 Forms</span>
                <span className="sm:hidden">W9</span>
              </TabsTrigger>

              {/* Financial Dropdown with Improved Styling */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-sm px-3 py-2.5 h-auto rounded font-medium transition-all duration-200 border border-transparent ${
                      ['financial-overview', 'user-records', 'payment-tracking', 'stipends', 'budget', 'reports'].includes(activeTab) 
                        ? 'bg-brand-500 text-white shadow-md border-brand-600' 
                        : 'hover:border-gray-200'
                    }`}
                  >
                    <Calculator className="h-4 w-4" />
                    <span className="hidden sm:inline">Financial</span>
                    <span className="sm:hidden">Fin</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white border border-gray-200 shadow-xl rounded-lg z-50 p-1">
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('financial-overview')}
                    className="text-gray-900 hover:bg-brand-50 hover:text-brand-700 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <TrendingUp className="h-4 w-4 mr-3 text-brand-500" />
                    <span className="font-medium">Overview</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('user-records')}
                    className="text-gray-900 hover:bg-brand-50 hover:text-brand-700 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <FileText className="h-4 w-4 mr-3 text-brand-500" />
                    <span className="font-medium">User Records</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('payment-tracking')}
                    className="text-gray-900 hover:bg-brand-50 hover:text-brand-700 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <CreditCard className="h-4 w-4 mr-3 text-brand-500" />
                    <span className="font-medium">Payment Tracking</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-gray-100" />
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('stipends')}
                    className="text-gray-900 hover:bg-brand-50 hover:text-brand-700 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <DollarSign className="h-4 w-4 mr-3 text-brand-500" />
                    <span className="font-medium">Stipends</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('budget')}
                    className="text-gray-900 hover:bg-brand-50 hover:text-brand-700 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <PieChart className="h-4 w-4 mr-3 text-brand-500" />
                    <span className="font-medium">Budget</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('reports')}
                    className="text-gray-900 hover:bg-brand-50 hover:text-brand-700 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <BarChart3 className="h-4 w-4 mr-3 text-brand-500" />
                    <span className="font-medium">Reports</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* System Tools Dropdown with Improved Styling */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 hover:border-gray-200 text-sm px-3 py-2.5 h-auto rounded font-medium transition-all duration-200 border border-transparent"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Tools</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white border border-gray-200 shadow-xl rounded-lg z-50 p-1">
                  <DropdownMenuItem 
                    onClick={() => console.log('System settings')}
                    className="text-gray-900 hover:bg-gray-50 hover:text-gray-900 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <Settings className="h-4 w-4 mr-3 text-gray-500" />
                    <span className="font-medium">System Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => console.log('Activity logs')}
                    className="text-gray-900 hover:bg-gray-50 hover:text-gray-900 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <Shield className="h-4 w-4 mr-3 text-gray-500" />
                    <span className="font-medium">Activity Logs</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-gray-100" />
                  <DropdownMenuItem 
                    onClick={() => console.log('Bulk actions')}
                    className="text-gray-900 hover:bg-gray-50 hover:text-gray-900 cursor-pointer rounded px-3 py-2 transition-colors duration-150"
                  >
                    <FileText className="h-4 w-4 mr-3 text-gray-500" />
                    <span className="font-medium">Bulk Actions</span>
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
