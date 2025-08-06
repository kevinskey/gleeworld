import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, Shield, UserCheck } from 'lucide-react';
import { PermissionGroupManager } from './PermissionGroupManager';
import { UserGroupAssignment } from './UserGroupAssignment';
import { AdvancedPermissionPanels } from './AdvancedPermissionPanels';
import { ExecutiveBoardPermissionPanel } from './ExecutiveBoardPermissionPanel';
import { PermissionErrorBoundary } from './PermissionErrorBoundary';
import { usePermissionGroups } from '@/hooks/usePermissionGroups';

const PermissionOverview = () => {
  const { groups, loading } = usePermissionGroups();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = {
    totalGroups: groups.length,
    defaultGroups: groups.filter(g => g.is_default).length,
    customGroups: groups.filter(g => !g.is_default).length,
    activeGroups: groups.filter(g => g.is_active).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              Permission groups configured
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Groups</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.defaultGroups}</div>
            <p className="text-xs text-muted-foreground">
              System-provided groups
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Groups</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customGroups}</div>
            <p className="text-xs text-muted-foreground">
              User-created groups
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeGroups}</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Groups Overview</CardTitle>
          <CardDescription>
            Quick overview of all configured permission groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {groups.map(group => (
              <Badge
                key={group.id}
                variant={group.is_default ? "default" : "secondary"}
                className="flex items-center gap-2"
                style={{
                  backgroundColor: `${group.color}20`,
                  borderColor: group.color,
                  color: group.color
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                {group.name}
                {group.is_default && (
                  <span className="text-xs opacity-70">(Default)</span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PermissionManagement = () => {
  console.log('PermissionManagement component loading...');
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permission Management</h1>
        <p className="text-muted-foreground">
          Manage permission groups and user assignments for the Glee Club platform
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="assignments">User Assignments</TabsTrigger>
          <TabsTrigger value="executive">Executive Board</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Panels</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <PermissionOverview />
        </TabsContent>
        
        <TabsContent value="groups" className="space-y-4">
          <PermissionGroupManager />
        </TabsContent>
        
        <TabsContent value="assignments" className="space-y-4">
          <UserGroupAssignment />
        </TabsContent>
        
        <TabsContent value="executive" className="space-y-4">
          <PermissionErrorBoundary>
            <ExecutiveBoardPermissionPanel />
          </PermissionErrorBoundary>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4">
          <PermissionErrorBoundary>
            <AdvancedPermissionPanels />
          </PermissionErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
};