import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Grid3X3, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

interface OpenModule {
  id: string;
  name: string;
  component: React.ComponentType<ModuleProps>;
  zIndex: number;
}

interface UserPermissions {
  modulePermissions: string[];
  usernamePermissions: string[];
  isAdmin: boolean;
  isExecBoard: boolean;
}

const BASELINE_MODULE_IDS = ['music-library','calendar-management','attendance-management'];

interface ModularDashboardProps {
  hideHeader?: boolean;
}

export const ModularDashboard: React.FC<ModularDashboardProps> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const [openModules, setOpenModules] = useState<OpenModule[]>([]);
  const [availableModules, setAvailableModules] = useState<typeof UNIFIED_MODULES>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    modulePermissions: [],
    usernamePermissions: [],
    isAdmin: false,
    isExecBoard: false
  });
  const [loading, setLoading] = useState(true);
  const [nextZIndex, setNextZIndex] = useState(100);

  useEffect(() => {
    if (user) {
      fetchUserPermissions();
    }
  }, [user]);

  useEffect(() => {
    filterAvailableModules();
  }, [userPermissions]);

  const fetchUserPermissions = async () => {
    if (!user) return;

    try {
      // Get user profile for admin status
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, is_exec_board, email')
        .eq('user_id', user.id)
        .single();

      // Get module permissions
      const { data: modulePerms } = await supabase
        .rpc('get_user_modules', { user_id_param: user.id });

      // Get username permissions
      const { data: usernamePerms } = await supabase
        .rpc('get_user_username_permissions', { user_email_param: user.email || '' });

      setUserPermissions({
        modulePermissions: modulePerms?.map((p: any) => p.module_name) || [],
        usernamePermissions: usernamePerms?.map((p: any) => p.module_name) || [],
        isAdmin: profile?.is_admin || profile?.is_super_admin || false,
        isExecBoard: profile?.is_exec_board || false
      });

    } catch (error) {
      console.error('Error fetching user permissions:', error);
      toast.error('Failed to load user permissions');
    } finally {
      setLoading(false);
    }
  };

  const filterAvailableModules = () => {
    const filtered = UNIFIED_MODULES.filter(module => {
      // Admin has access to everything
      if (userPermissions.isAdmin) return true;

      // Check if user has specific module permission
      if (userPermissions.modulePermissions.includes(module.name)) return true;

      // Check username-based permissions
      if (userPermissions.usernamePermissions.includes(module.name)) return true;

      // Check role-based access
      if (module.requiredRoles?.includes('executive') && userPermissions.isExecBoard) return true;

      return false;
    });

    // Ensure baseline modules are always available to all authenticated members
    const baselineModules = UNIFIED_MODULES.filter(m => BASELINE_MODULE_IDS.includes(m.id));
    const uniqueById = new Map([...filtered, ...baselineModules].map(m => [m.id, m]));

    setAvailableModules(Array.from(uniqueById.values()));
  };

  const openModule = (moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    if (!module) return;

    // Check if module is already open
    const existingModule = openModules.find(m => m.id === moduleId);
    if (existingModule) {
      // Bring to front
      bringModuleToFront(moduleId);
      return;
    }

    const newModule: OpenModule = {
      id: moduleId,
      name: module.name,
      component: module.component,
      zIndex: nextZIndex
    };

    setOpenModules(prev => [...prev, newModule]);
    setNextZIndex(prev => prev + 1);
  };

  const closeModule = (moduleId: string) => {
    setOpenModules(prev => prev.filter(m => m.id !== moduleId));
  };

  const bringModuleToFront = (moduleId: string) => {
    setOpenModules(prev => prev.map(module => 
      module.id === moduleId 
        ? { ...module, zIndex: nextZIndex }
        : module
    ));
    setNextZIndex(prev => prev + 1);
  };

  const closeAllModules = () => {
    setOpenModules([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 relative">
      {/* Dashboard Header */}
      {!hideHeader && (
        <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Grid3X3 className="h-6 w-6 text-primary" />
                  <div>
                    <h1 className="text-xl font-bold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {openModules.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {openModules.length} open
                    </Badge>
                    <Button variant="outline" size="sm" onClick={closeAllModules}>
                      Close All
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Grid */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {availableModules.map((module) => (
            <Card 
              key={module.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => openModule(module.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                    <module.icon className={`h-5 w-5 text-${module.iconColor}-600`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {module.title}
                    </h3>
                    {module.isNew && (
                      <Badge variant="secondary" className="text-xs">New</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {availableModules.length === 0 && (
          <div className="text-center py-12">
            <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No modules available</h3>
            <p className="text-sm text-muted-foreground">Contact an administrator to request module access</p>
          </div>
        )}
      </div>

      {/* Open Modules */}
      {openModules.map((openModule) => (
        <div
          key={openModule.id}
          className="fixed inset-4 bg-background border border-border rounded-lg shadow-2xl"
          style={{ zIndex: openModule.zIndex }}
          onClick={() => bringModuleToFront(openModule.id)}
        >
          {/* Module Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/50">
            <h2 className="font-semibold">{openModule.name}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                closeModule(openModule.id);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Module Content */}
          <div className="h-[calc(100%-64px)] overflow-auto">
            <openModule.component user={user} isFullPage={true} />
          </div>
        </div>
      ))}
    </div>
  );
};