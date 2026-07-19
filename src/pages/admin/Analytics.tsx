import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart, TrendingUp, Download } from "lucide-react";
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const Analytics = () => {
  return (
    <DashboardPageShell
      title="Analytics & Reports"
      subtitle="Usage stats, financial reports, and insights"
      actions={
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Platform Usage
            </CardTitle>
            <CardDescription>Daily active users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <p className="text-sm text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Event Attendance
            </CardTitle>
            <CardDescription>Average attendance rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-sm text-muted-foreground">Across all events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Financial Growth
            </CardTitle>
            <CardDescription>Revenue trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+23%</div>
            <p className="text-sm text-muted-foreground">Quarterly growth</p>
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
};

export default Analytics;