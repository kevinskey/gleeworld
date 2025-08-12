import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  Settings, 
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { UsernamePermissionsManager } from './UsernamePermissionsManager';

export const AdvancedPermissionPanels = () => {
  console.log('AdvancedPermissionPanels component loading...');
  
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">User Overview</TabsTrigger>
        <TabsTrigger value="username">Username Permissions</TabsTrigger>
        <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">50</div>
              <p className="text-xs text-muted-foreground">Platform users</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Groups</CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">25</div>
              <p className="text-xs text-muted-foreground">Have permission groups</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Executive Board</CardTitle>
              <Settings className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">Including Onnesty</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Permissions expiring</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="username" className="space-y-6">
        <UsernamePermissionsManager />
      </TabsContent>

      <TabsContent value="bulk" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Permission Operations</CardTitle>
            <CardDescription>Perform operations on multiple users at once</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Bulk operations panel coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="audit" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Permission Audit Trail</CardTitle>
            <CardDescription>Track all permission changes and administrative actions</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Audit trail functionality coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Permission Analytics</CardTitle>
            <CardDescription>Detailed analytics and reporting</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Advanced permission analytics and reporting features will be available here.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};