
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Library } from "@/components/Library";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { AIAssist } from "@/components/shared/AIAssist";
import { DocumentManager } from "@/components/shared/DocumentManager";
import { 
  FileText, 
  CheckCircle, 
  DollarSign, 
  Bell, 
  RefreshCw,
  User,
  Mail,
  Calendar
} from "lucide-react";
import { useUserDashboard } from "@/hooks/useUserDashboard";
import { useUserContracts } from "@/hooks/useUserContracts";
import { useW9Forms } from "@/hooks/useW9Forms";
import { useAuth } from "@/contexts/AuthContext";
import { UserContractsList } from "./UserContractsList";
import { UserPaymentsList } from "./UserPaymentsList";
import { UserNotificationsList } from "./UserNotificationsList";
import { UserW9FormsList } from "./UserW9FormsList";
import { FinanceManagement } from "@/components/finance/FinanceManagement";
import { useState } from "react";

export const UserDashboard = () => {
  const { user } = useAuth();
  const { dashboardData, loading, error, refetch } = useUserDashboard();
  const { contracts } = useUserContracts();
  const { w9Forms } = useW9Forms();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!user) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center py-20">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Authentication Required</h3>
                <p className="text-gray-600 mb-4">Please sign in to access your dashboard.</p>
                <Button onClick={() => window.location.href = '/auth'}>
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  if (loading) {
    return (
      <UniversalLayout>
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </UniversalLayout>
    );
  }

  if (error) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center py-20">
          <ErrorState message={error} onRetry={refetch} />
        </div>
      </UniversalLayout>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "library":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">My Documents</h2>
            </div>
            <Library />
            <DocumentManager bucket="user-files" />
          </div>
        );
      case "finance":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">My Finance</h2>
            </div>
            <FinanceManagement />
          </div>
        );
      case "dashboard":
      default:
        return (
          <div className="space-y-6">

            {/* Stats Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Overview</h2>
                <Button 
                  onClick={refetch} 
                  variant="outline" 
                  size="sm"
                  className="border-brand-400/50 text-brand-700 hover:bg-brand-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Total Contracts</CardTitle>
                  <FileText className="h-4 w-4 text-brand-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData?.total_contracts || 0}</div>
                  <p className="text-xs text-gray-600">
                    {dashboardData?.signed_contracts || 0} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">W9 Forms</CardTitle>
                  <CheckCircle className="h-4 w-4 text-brand-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData?.w9_forms_count || 0}</div>
                  <p className="text-xs text-gray-600">Submitted</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Payments</CardTitle>
                  <DollarSign className="h-4 w-4 text-brand-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData?.payments_received || 0}</div>
                  <p className="text-xs text-gray-600">
                    ${dashboardData?.total_amount_received || 0} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Notifications</CardTitle>
                  <Bell className="h-4 w-4 text-brand-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData?.unread_notifications || 0}</div>
                  <p className="text-xs text-gray-600">Unread</p>
                </CardContent>
              </Card>
            </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="contracts" className="space-y-6">
              <div className="overflow-x-auto">
                <TabsList className="bg-white/95 backdrop-blur-sm border border-brand-200/30 w-full grid grid-cols-4 h-auto p-1 gap-1">
                  <TabsTrigger 
                    value="contracts" 
                    className="text-gray-700 data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800 text-xs sm:text-sm px-2 py-2 min-h-[44px] flex flex-col items-center gap-1"
                  >
                    <span className="hidden sm:inline">Contracts</span>
                    <span className="sm:hidden">Contracts</span>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {contracts.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="w9forms" 
                    className="text-gray-700 data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800 text-xs sm:text-sm px-2 py-2 min-h-[44px] flex flex-col items-center gap-1"
                  >
                    <span className="hidden sm:inline">W9 Forms</span>
                    <span className="sm:hidden">W9s</span>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {w9Forms?.length || 0}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="payments" 
                    className="text-gray-700 data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800 text-xs sm:text-sm px-2 py-2 min-h-[44px] flex flex-col items-center gap-1"
                  >
                    <span className="hidden sm:inline">Payments</span>
                    <span className="sm:hidden">Pay</span>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {dashboardData?.payments_received || 0}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    className="text-gray-700 data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800 text-xs sm:text-sm px-2 py-2 min-h-[44px] flex flex-col items-center gap-1"
                  >
                    <span className="hidden sm:inline">Notifications</span>
                    <span className="sm:hidden">Alerts</span>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {dashboardData?.unread_notifications || 0}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="contracts">
                <UserContractsList />
              </TabsContent>

              <TabsContent value="w9forms">
                <UserW9FormsList />
              </TabsContent>

              <TabsContent value="payments">
                <UserPaymentsList />
              </TabsContent>

              <TabsContent value="notifications">
                <UserNotificationsList />
              </TabsContent>
            </Tabs>
          </div>
        );
    }
  };

  return (
    <UniversalLayout containerized={false}>
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/95 backdrop-blur-sm">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {renderContent()}
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};
