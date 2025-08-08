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
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

import { PluginManagementDashboard } from '@/components/admin/PluginManagementDashboard';
import { SystemModule } from '@/components/admin/SystemModule';

const adminModules = [
  { id: 'plugin-management', name: 'Plugin Management', icon: Settings, description: 'Control modular plugins across the platform' },
  { id: 'user-management', name: 'User Management', icon: Users, description: 'Manage users and permissions' },
  { id: 'system', name: 'System', icon: BarChart3, description: 'System stats, health, and monitoring' },
  { id: 'audition-system', name: 'Audition System', icon: Music, description: 'Manage auditions and auditioner registrations' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'View platform analytics' },
  { id: 'communications', name: 'Communications', icon: Mail, description: 'Send emails and notifications' },
  { id: 'events', name: 'Events', icon: Calendar, description: 'Manage events and calendar' },
  { id: 'content', name: 'Content', icon: FileText, description: 'Manage site content' },
  { id: 'security', name: 'Security', icon: Shield, description: 'Security settings and access control' },
  { id: 'database', name: 'Database', icon: Database, description: 'Database management' },
  { id: 'music-library', name: 'Music Library', icon: Music, description: 'Manage music files' },
  { id: 'finance', name: 'Finance', icon: DollarSign, description: 'Financial management' },
];

export const FreshAdminDashboard = () => {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'admin' | 'member'>('admin');
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch/swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startY = touch.clientY;
    
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaY = startY - touch.clientY;
      
      if (Math.abs(deltaY) > 10) { // Minimum swipe distance
        setIsAnimating(true);
        setScrollOffset(prev => prev + deltaY * 0.5);
      }
    };

    const handleTouchEnd = () => {
      setIsAnimating(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Mouse drag detection
  const handleMouseDown = (e: React.MouseEvent) => {
    const startY = e.clientY;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      
      if (Math.abs(deltaY) > 10) { // Minimum drag distance
        setIsAnimating(true);
        setScrollOffset(prev => prev + deltaY * 0.5);
      }
    };

    const handleMouseUp = () => {
      setIsAnimating(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

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
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Add New User
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Create Event
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Modules Grid */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Administration Modules</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a module to manage different aspects of the platform
            </p>
          </CardHeader>
          <CardContent>
            <div 
              className="relative h-[600px] overflow-hidden touch-pan-y select-none cursor-grab active:cursor-grabbing"
              onTouchStart={handleTouchStart}
              onMouseDown={handleMouseDown}
            >
              <div 
                className="flex flex-col gap-3 transition-transform duration-300"
                style={{
                  transform: `translateY(${scrollOffset}px)`,
                }}
              >
                {/* Duplicate modules for seamless loop */}
                {[...adminModules, ...adminModules].map((module, index) => (
                  <Card 
                    key={`${module.id}-${index}`}
                    className={`cursor-pointer transition-all hover:shadow-md border-border w-full h-[180px] flex-shrink-0 ${
                      selectedModule === module.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'bg-background/30 hover:bg-background/60'
                    }`}
                    onClick={() => setSelectedModule(module.id)}
                  >
                    <CardContent className="p-4 text-center h-full flex flex-col justify-center">
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
              
              {/* Gradient overlays for seamless effect */}
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
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