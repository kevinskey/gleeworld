
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SystemDashboard } from "@/components/admin/SystemDashboard";
import { UserManagement } from "@/components/admin/UserManagement";
import { W9Management } from "@/components/admin/W9Management";
import { FinancialSystem } from "@/components/admin/FinancialSystem";
import { ContractManagement } from "@/components/admin/ContractManagement";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAuth } from "@/contexts/AuthContext";
import { Library } from "@/components/Library";
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
  BarChart3,
  Library as LibraryIcon
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
      <div className="container mx-auto px-2 sm:px-4 py-3">
        <div className="mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-white mb-1">System Administration</h1>
          <p className="text-gray-300 text-xs sm:text-sm">Comprehensive management and oversight tools</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile-Optimized Tab Layout */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm p-2">
            <TabsList className="w-full bg-white p-1 h-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-1 border border-gray-100 rounded-md shadow-sm">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center justify-center gap-1 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded font-medium transition-all duration-200 min-h-[2.5rem]"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:hidden lg:inline truncate">Dashboard</span>
                <span className="xs:hidden sm:inline lg:hidden truncate">Dash</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="users" 
                className="flex items-center justify-center gap-1 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded font-medium transition-all duration-200 min-h-[2.5rem]"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Users</span>
              </TabsTrigger>

              <TabsTrigger 
                value="contracts" 
                className="flex items-center justify-center gap-1 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded font-medium transition-all duration-200 min-h-[2.5rem]"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Contracts</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="payments" 
                className="flex items-center justify-center gap-1 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded font-medium transition-all duration-200 min-h-[2.5rem]"
              >
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Payments</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="w9" 
                className="flex items-center justify-center gap-1 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded font-medium transition-all duration-200 min-h-[2.5rem]"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline lg:hidden truncate">W9</span>
                <span className="hidden lg:inline truncate">W9 Forms</span>
              </TabsTrigger>

              <TabsTrigger 
                value="library" 
                className="flex items-center justify-center gap-1 data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded font-medium transition-all duration-200 min-h-[2.5rem]"
              >
                <LibraryIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Library</span>
              </TabsTrigger>

              {/* Financial Dropdown with Mobile Optimization */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`flex items-center justify-center gap-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 h-auto rounded font-medium transition-all duration-200 border border-transparent min-h-[2.5rem] ${
                      ['financial-overview', 'user-records', 'payment-tracking', 'stipends', 'budget', 'reports'].includes(activeTab) 
                        ? 'bg-brand-500 text-white shadow-md border-brand-600' 
                        : 'hover:border-gray-200'
                    }`}
                  >
                    <Calculator className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline lg:hidden truncate">Fin</span>
                    <span className="hidden lg:inline truncate">Financial</span>
                    <ChevronDown className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
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

              {/* System Tools Dropdown with Mobile Optimization */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center justify-center gap-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 hover:border-gray-200 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 h-auto rounded font-medium transition-all duration-200 border border-transparent min-h-[2.5rem]"
                  >
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Tools</span>
                    <ChevronDown className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
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

          <TabsContent value="w9" className="space-y-4">
            <W9Management />
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <FinancialSystem />
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <Library />
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};

export default System;
