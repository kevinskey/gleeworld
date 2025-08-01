import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard
} from "lucide-react";

interface DuesOverviewProps {
  duesRecords: any[];
  paymentPlans: any[];
  reminders: any[];
}

export const DuesOverview = ({ duesRecords, paymentPlans, reminders }: DuesOverviewProps) => {
  const calculateStats = () => {
    const totalRecords = duesRecords.length;
    const paidRecords = duesRecords.filter(r => r.status === 'paid').length;
    const pendingRecords = duesRecords.filter(r => r.status === 'pending').length;
    const overdueRecords = duesRecords.filter(r => r.status === 'overdue').length;
    
    const totalAmount = duesRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const paidAmount = duesRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.amount || 0), 0);
    const pendingAmount = totalAmount - paidAmount;
    
    const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    
    const activePlans = paymentPlans.filter(p => p.status === 'active').length;
    const activeReminders = reminders.filter(r => r.is_active).length;
    
    return {
      totalRecords,
      paidRecords,
      pendingRecords,
      overdueRecords,
      totalAmount,
      paidAmount,
      pendingAmount,
      collectionRate,
      activePlans,
      activeReminders
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 border-brand-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-primary">
              ${stats.totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalRecords} dues records
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ${stats.paidAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.paidRecords} paid records
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              ${stats.pendingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingRecords + stats.overdueRecords} outstanding
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-brand-accent/10 to-brand-gold/10 border-brand-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-gold">
              {stats.collectionRate.toFixed(1)}%
            </div>
            <Progress value={stats.collectionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Payment Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Paid
                </Badge>
                <span className="text-sm">{stats.paidRecords} members</span>
              </div>
              <span className="font-semibold">${stats.paidAmount.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Pending
                </Badge>
                <span className="text-sm">{stats.pendingRecords} members</span>
              </div>
              <span className="font-semibold text-orange-600">
                ${(stats.pendingAmount - (stats.overdueRecords * (stats.totalAmount / stats.totalRecords || 0))).toFixed(2)}
              </span>
            </div>
            
            {stats.overdueRecords > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    Overdue
                  </Badge>
                  <span className="text-sm">{stats.overdueRecords} members</span>
                </div>
                <span className="font-semibold text-red-600">
                  ${(stats.overdueRecords * (stats.totalAmount / stats.totalRecords || 0)).toFixed(2)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Management Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-subtle/20 border border-brand-accent/20">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand-primary" />
                <span className="font-medium">Payment Plans</span>
              </div>
              <Badge variant="outline" className="border-brand-primary text-brand-primary">
                {stats.activePlans} Active
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-subtle/20 border border-brand-accent/20">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-secondary" />
                <span className="font-medium">Reminders</span>
              </div>
              <Badge variant="outline" className="border-brand-secondary text-brand-secondary">
                {stats.activeReminders} Active
              </Badge>
            </div>
            
            {stats.overdueRecords > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800">Attention Needed</span>
                </div>
                <Badge variant="destructive">
                  {stats.overdueRecords} Overdue
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};