import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Key, Users, Lock } from "lucide-react";

const AccessControl = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Access Control</h1>
          <p className="text-muted-foreground">Role assignments and security policies</p>
        </div>
        <Button>
          <Shield className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Roles
            </CardTitle>
            <CardDescription>Manage user role assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Admins</span>
                <span className="font-bold">5</span>
              </div>
              <div className="flex justify-between">
                <span>Members</span>
                <span className="font-bold">85</span>
              </div>
              <div className="flex justify-between">
                <span>Alumni</span>
                <span className="font-bold">245</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Manage Roles
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Permissions
            </CardTitle>
            <CardDescription>Configure access permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <strong>15</strong> permission groups
              </div>
              <div className="text-sm">
                <strong>48</strong> individual permissions
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Edit Permissions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security Policies
            </CardTitle>
            <CardDescription>System security rules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">Password requirements: ✓</div>
              <div className="text-sm">Session timeout: 2 hours</div>
              <div className="text-sm">Failed login attempts: 5</div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Update Policies
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessControl;