
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const UserDashboard = () => {
  const { user } = useAuth();
  const { dashboardData, loading, error, refetch } = useUserDashboard();
  const { contracts } = useUserContracts();
  const { w9Forms } = useW9Forms();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex items-center justify-center">
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
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/70">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {dashboardData?.full_name || user.email}
              </h1>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{dashboardData?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={refetch} 
              variant="outline" 
              className="border-brand-400/50 text-brand-700 hover:bg-brand-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="contracts" className="space-y-6">
          <TabsList className="bg-white/95 backdrop-blur-sm border border-brand-200/30">
            <TabsTrigger value="contracts" className="text-gray-700 data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800">
              Contracts ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="w9forms" className="text-gray-700 data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800">
              W9 Forms ({w9Forms?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-gray-700 data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800">
              Payments ({dashboardData?.payments_received || 0})
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-gray-700 data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800">
              Notifications ({dashboardData?.unread_notifications || 0})
            </TabsTrigger>
          </TabsList>

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
    </div>
  );
};
