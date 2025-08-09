import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Key, Users, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Link } from "react-router-dom";
import { RoleTransitionManager } from '@/components/admin/RoleTransitionManager';
import { PermissionManagement } from '@/components/admin/PermissionManagement';
import { ROUTES } from '@/constants/routes';
const AccessControl = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Access Control"
        description="Role assignments and security policies"
        showBackButton
        backTo={(userProfile?.is_admin || userProfile?.is_super_admin) ? '/admin' : '/dashboard'}
        backgroundVariant="gradient"
      >
        <Button>
          <Shield className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </PageHeader>

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
            <Button asChild variant="outline" className="w-full mt-4">
              <Link to="#role-manager">Manage Roles</Link>
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
            <Button asChild variant="outline" className="w-full mt-4">
              <Link to={ROUTES.PERMISSIONS}>Edit Permissions</Link>
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

      {/* Role Manager Section */}
      <section id="role-manager" aria-labelledby="role-manager-heading" className="space-y-4 scroll-mt-24 animate-fade-in">
        <h2 id="role-manager-heading" className="text-xl font-semibold">Role Manager</h2>
        <RoleTransitionManager />
      </section>

      {/* Permissions Section */}
      <section id="permissions" aria-labelledby="permissions-heading" className="space-y-4 scroll-mt-24 animate-fade-in">
        <h2 id="permissions-heading" className="text-xl font-semibold">Permissions</h2>
        <PermissionManagement />
      </section>
    </div>
  );
};

export default AccessControl;
