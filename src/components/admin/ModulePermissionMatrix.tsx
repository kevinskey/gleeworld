
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, User, Settings } from 'lucide-react';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { RoleModuleMatrix } from './RoleModuleMatrix';
import { UserModuleMatrix } from './UserModuleMatrix';
import { UsernamePermissionsManager } from './UsernamePermissionsManager';

type TabType = 'overview' | 'roles' | 'users' | 'username';

export const ModulePermissionMatrix: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const activeModules = UNIFIED_MODULES.filter(m => m.isActive !== false);
  const modulesByCategory = activeModules.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, typeof UNIFIED_MODULES>);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold">Total Modules</h3>
                <p className="text-2xl font-bold">{activeModules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold">Categories</h3>
                <p className="text-2xl font-bold">{Object.keys(modulesByCategory).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modules by Category</CardTitle>
          <CardDescription>
            Overview of all available modules organized by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(modulesByCategory).map(([category, modules]) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold capitalize">{category}</h3>
                  <Badge variant="secondary">{modules.length} modules</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {modules.map(module => (
                    <Badge key={module.id} variant="outline">
                      {module.title}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'roles', label: 'Role Permissions', icon: Users },
    { id: 'username', label: 'Username Permissions', icon: User }
  ] as const;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Module Permission Management</CardTitle>
          <CardDescription>
            Manage permissions for modules across roles and individual users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-6 border-b">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>

          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'roles' && <RoleModuleMatrix />}
          {activeTab === 'username' && <UsernamePermissionsManager />}
        </CardContent>
      </Card>
    </div>
  );
};
