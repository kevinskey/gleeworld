import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Settings, 
  BarChart3, 
  Mail, 
  Calendar,
  FileText,
  Shield,
  Database,
  MessageSquare,
  Music,
  GraduationCap,
  DollarSign,
  Package,
  ShoppingBag,
  Radio,
  ArrowUpDown,
  Edit3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { useNavigate } from 'react-router-dom';
import { BucketsOfLoveWidget } from '@/components/shared/BucketsOfLoveWidget';

import { PluginManagementDashboard } from '@/components/admin/PluginManagementDashboard';
import { SystemModule } from '@/components/admin/SystemModule';
import { GleeWritingWidget } from '@/components/writing/GleeWritingWidget';

const adminModules = [
  { id: 'plugin-management', name: 'Plugin Management', icon: Settings, description: 'Control modular plugins across the platform' },
  { id: 'user-management', name: 'User Management', icon: Users, description: 'Manage users and permissions', route: '/user-management' },
  { id: 'auditions', name: 'Auditions', icon: Music, description: 'Manage auditions and registrations', route: '/admin/auditions' },
  { id: 'attendance', name: 'Attendance', icon: Calendar, description: 'Track rehearsal and event attendance', route: '/attendance' },
  { id: 'bookkeeping', name: 'Bookkeeping', icon: DollarSign, description: 'Treasurer & finance tools', route: '/treasurer' },
  { id: 'communications', name: 'Communications', icon: Mail, description: 'Email, SMS, in-app messaging', route: '/admin/communications' },
  { id: 'calendar', name: 'Calendar', icon: Calendar, description: 'Internal calendar and events', route: '/events' },
  { id: 'schedules', name: 'Schedules', icon: Calendar, description: 'Scheduling and availability', route: '/scheduling' },
  { id: 'community-hub', name: 'Community Hub', icon: MessageSquare, description: 'Community features hub', route: '/dashboard' },
  { id: 'event-planner', name: 'Event Planner', icon: Calendar, description: 'Plan and manage events', route: '/event-planner' },
  { id: 'tour-planner', name: 'Tour Planner', icon: Calendar, description: 'Plan tours and routes', route: '/tour-planner' },
  { id: 'glee-writing', name: 'Glee Writing', icon: Edit3, description: 'Rich editor for docs & lyrics' },
  { id: 'shop', name: 'Shop', icon: ShoppingBag, description: 'Public storefront', route: '/shop' },
  { id: 'inventory-products', name: 'Inventory & Products', icon: Package, description: 'Admin product management', route: '/admin/products' },
  { id: 'scholarships', name: 'Scholarships', icon: GraduationCap, description: 'Manage scholarships', route: '/admin/scholarships' },
  { id: 'contracts', name: 'Contracts', icon: FileText, description: 'Contracts and signatures', route: '/contracts' },
  { id: 'booking', name: 'Appointments / Booking', icon: Calendar, description: 'Service booking and scheduling', route: '/booking' },
  { id: 'radio', name: 'Radio', icon: Radio, description: 'Manage radio and streams', route: '/radio' },
  { id: 'music-library', name: 'Music Library', icon: Music, description: 'Scores and recordings', route: '/music-library' },
  { id: 'media-library', name: 'Media Library', icon: Music, description: 'Photos, audio, video', route: '/admin/media' },
  { id: 'member-directory', name: 'Member Directory', icon: Users, description: 'Browse and manage members', route: '/member-directory' },
  { id: 'wardrobe', name: 'Wardrobe', icon: FileText, description: 'Costumes and attire', route: '/wardrobe' },
  { id: 'executive-board', name: 'Executive Board', icon: Shield, description: 'Board dashboards', route: '/admin/executive' },
  { id: 'documents', name: 'Documents & Forms', icon: FileText, description: 'Contracts, W9s, and official paperwork', route: '/admin/documents' },
  { id: 'access-control', name: 'Access Control', icon: Shield, description: 'Role assignments and security policies', route: '/admin/access' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Platform analytics', route: '/admin/analytics' },
  { id: 'database', name: 'Database', icon: Database, description: 'Database management', route: '/admin/database' },
  { id: 'system-settings', name: 'System Settings', icon: Settings, description: 'Platform configuration', route: '/admin/settings' },
  { id: 'module-access', name: 'Module Access', icon: Shield, description: 'Assign module visibility to users', route: '/admin/module-access' },
];

export const FreshAdminDashboard = () => {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'admin' | 'member'>('admin');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const sortedModules = React.useMemo(() => {
    const arr = [...adminModules].sort((a, b) => a.name.localeCompare(b.name));
    if (sortOrder === 'desc') arr.reverse();
    return arr;
  }, [sortOrder]);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <UniversalHeader 
        viewMode={viewMode} 
        onViewModeChange={setViewMode}
      />
      
      <div className="container mx-auto px-6 py-6">
        <Card className="mb-8 bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/user-management')}>
                <Users className="h-4 w-4 mr-2" />
                Add New User
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/notifications/send')}>
                <Mail className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/event-planner')}>
                <Calendar className="h-4 w-4 mr-2" />
                Create Event
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/analytics')}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Buckets of Love - visible for all authenticated users */}
        <div className="mb-8">
          <BucketsOfLoveWidget />
        </div>

        {/* Admin Modules Grid */}
        <Card className="bg-background/50 border-border">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Administration Modules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a module to manage different aspects of the platform
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                aria-label={sortOrder === 'asc' ? 'Sort Z–A' : 'Sort A–Z'}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort {sortOrder === 'asc' ? 'A–Z' : 'Z–A'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedModules.map((module) => (
                <Card 
                  key={module.id}
                  className={`cursor-pointer transition-all hover:shadow-md border-border ${
                    selectedModule === module.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'bg-background/30 hover:bg-background/60'
                  }`}
                  onClick={() => module.route ? navigate(module.route) : setSelectedModule(module.id)}
                >
                  <CardContent className="p-4 text-center h-full flex flex-col justify-center min-h-[160px]">
                    <div className="mb-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                        <module.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{module.name}</h3>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Module Content */}
        {selectedModule && (
          <Card className="mt-6 bg-background/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg">
                {adminModules.find(m => m.id === selectedModule)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {selectedModule === 'plugin-management' ? (
                <PluginManagementDashboard />
              ) : selectedModule === 'system' ? (
                <SystemModule />
              ) : selectedModule === 'glee-writing' ? (
                <GleeWritingWidget />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    {React.createElement(
                      adminModules.find(m => m.id === selectedModule)?.icon || Settings,
                      { className: "h-8 w-8 text-primary" }
                    )}
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {adminModules.find(m => m.id === selectedModule)?.name} Module
                  </h3>
                  <p className="text-sm">
                    {adminModules.find(m => m.id === selectedModule)?.description}
                  </p>
                  <Button className="mt-4" variant="outline">
                    Configure Module
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};