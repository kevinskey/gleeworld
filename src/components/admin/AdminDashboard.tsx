import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DollarSign, Users, CheckCircle, XCircle, Clock, Zap } from "lucide-react";

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Manage users, view statistics, and perform administrative tasks
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>All registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">1,457</div>
            <div className="text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 mr-1 inline-block" />
              Active accounts: 1,322
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unverified Accounts</CardTitle>
            <CardDescription>Users pending email verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">34</div>
            <div className="text-sm text-muted-foreground">
              <XCircle className="h-4 w-4 mr-1 inline-block" />
              Awaiting verification
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Sign-ups (Last 7 Days)</CardTitle>
            <CardDescription>Accounts created in the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">68</div>
            <div className="text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1 inline-block" />
              Average sign-ups per day: 9.7
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last Month)</CardTitle>
            <CardDescription>Total income from subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">$4,285</div>
            <div className="text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-1 inline-block" />
              Projected revenue this month: $4,500+
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to="/user-management">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto p-4">
                <Users className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">User Management</div>
                  <div className="text-sm text-muted-foreground">Manage all user accounts and roles</div>
                </div>
              </Button>
            </Link>
            
            <Link to="/permission-groups">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto p-4">
                <Users className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Permission Groups</div>
                  <div className="text-sm text-muted-foreground">Manage permission groups and assignments</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No recent activity to display.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
