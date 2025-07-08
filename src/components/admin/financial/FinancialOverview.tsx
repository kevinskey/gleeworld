
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Users, Calendar, Calculator } from "lucide-react";
import { useAdminFinancialOverview } from "@/hooks/useAdminFinancialOverview";
import { Badge } from "@/components/ui/badge";

export const FinancialOverview = () => {
  const { overview, loading, error } = useAdminFinancialOverview();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview?.totalPayments || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.totalPaymentCount || 0} payments made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stipends</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview?.totalStipends || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.totalStipendCount || 0} stipend records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview?.outstandingBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Across {overview?.activeUsers || 0} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview?.thisMonthPayments || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.thisMonthCount || 0} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest financial transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview?.recentActivity?.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'payment' ? 'bg-green-100' : 
                      activity.type === 'stipend' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {activity.type === 'payment' ? (
                        <DollarSign className="h-4 w-4 text-green-600" />
                      ) : activity.type === 'stipend' ? (
                        <Calculator className="h-4 w-4 text-blue-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-gray-500">{activity.user}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(activity.amount)}</p>
                    <p className="text-sm text-gray-500">{activity.date}</p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Distribution of payment methods used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview?.paymentMethods?.map((method, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-secondary/80 text-secondary-foreground">
                      {method.method}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(method.total)}</p>
                    <p className="text-sm text-gray-500">{method.count} payments</p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No payment data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
