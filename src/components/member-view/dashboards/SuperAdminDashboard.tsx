import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Crown, 
  Settings, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Users,
  Shield,
  Activity,
  Database
} from 'lucide-react';

interface SuperAdminDashboardProps {
  user: any;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Mock data for system overview
  const systemData = {
    totalUsers: 150,
    activeUsers: 42,
    systemUptime: 99.9,
    suspiciousActivity: 0,
    activeLogins: 12
  };

  const modules = [
    { id: 'user-management', title: 'User Management', description: 'Manage users and permissions', category: 'admin' },
    { id: 'security', title: 'Security Dashboard', description: 'Monitor security metrics', category: 'security' },
    { id: 'analytics', title: 'Analytics', description: 'View system analytics', category: 'insights' },
    { id: 'settings', title: 'System Settings', description: 'Configure system settings', category: 'admin' }
  ];

  const filteredModules = modules.filter(module => 
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedModule) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedModule(null)} className="p-0 h-auto">
            Super Admin Dashboard
          </Button>
          <span>/</span>
          <span className="text-foreground font-medium">{selectedModule}</span>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Module: {selectedModule}</CardTitle>
            <CardDescription>This module is under development</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Module content would be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-purple-600" />
            Director's Dashboard
          </h1>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Module Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <div className="mt-2 text-sm text-muted-foreground">
              Found {filteredModules.length} modules
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((module) => (
          <Card key={module.id} className="cursor-pointer hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-lg">{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => setSelectedModule(module.id)}
                className="w-full"
              >
                Open Module
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Overview */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl lg:text-2xl font-semibold">System Overview</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setOverviewCollapsed(!overviewCollapsed)} 
              className="flex items-center gap-2"
            >
              {overviewCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {overviewCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          </div>
        </CardHeader>
        
        {!overviewCollapsed && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* System Overview Card */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base lg:text-lg font-medium">System Overview</CardTitle>
                  <Crown className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl lg:text-4xl font-bold">{systemData.systemUptime}%</div>
                  <p className="text-sm lg:text-base text-muted-foreground">System uptime</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm lg:text-base">
                      <span>Total Users</span>
                      <span>{systemData.totalUsers}</span>
                    </div>
                    <div className="flex justify-between text-sm lg:text-base">
                      <span>Active Now</span>
                      <span>{systemData.activeUsers}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Metrics Card */}
              <Card className="border-2 border-red-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Security Metrics</CardTitle>
                  <Shield className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemData.suspiciousActivity}</div>
                  <p className="text-xs text-muted-foreground">Suspicious activities</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Active Logins</span>
                      <span>{systemData.activeLogins}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Card */}
              <Card className="border-2 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Activity</CardTitle>
                  <Activity className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">System status</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};