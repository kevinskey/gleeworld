import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Grid3X3, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIsMobile } from '@/hooks/use-mobile';

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
  onExpandChange?: (id: string | null) => void;
}

const SortableItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

export const ModularDashboard: React.FC<ModularDashboardProps> = ({ hideHeader = false, onExpandChange }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Debug logging
  console.log('🔧 ModularDashboard Debug:', { isMobile, window: typeof window !== 'undefined' ? window.innerWidth : 'SSR' });
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
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [moduleOrder, setModuleOrder] = useState<string[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  // Load/save user module order
  const fetchModuleOrder = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('gw_user_module_orders')
        .select('module_order')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.module_order) setModuleOrder(data.module_order as string[]);
    } catch (err) {
      console.error('Failed to load module order', err);
    }
  };

  const saveModuleOrder = async (order: string[]) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('gw_user_module_orders')
        .upsert({ user_id: user.id, module_order: order });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save module order', err);
    }
  };

  useEffect(() => {
    if (user) fetchModuleOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const orderedModules = useMemo(() => {
    if (!moduleOrder?.length) return availableModules;
    const map = new Map(availableModules.map(m => [m.id, m]));
    const ordered = moduleOrder.map(id => map.get(id)).filter(Boolean) as typeof availableModules;
    const rest = availableModules.filter(m => !moduleOrder.includes(m.id));
    return [...ordered, ...rest];
  }, [availableModules, moduleOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentOrder = orderedModules.map(m => m.id);
    const oldIndex = currentOrder.indexOf(String(active.id));
    const newIndex = currentOrder.indexOf(String(over.id));
    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
    setModuleOrder(newOrder);
    saveModuleOrder(newOrder);
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
    const nextId = expandedModuleId === moduleId ? null : moduleId;
    console.log('🎯 Opening module:', { moduleId, nextId, isMobile });
    setExpandedModuleId(nextId);
    onExpandChange?.(nextId);
    
    // Prevent body scroll on mobile when module is expanded
    if (isMobile) {
      if (nextId) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  };

  const closeModule = (moduleId: string) => {
    setExpandedModuleId(prev => (prev === moduleId ? null : prev));
    onExpandChange?.(null);
    
    // Restore body scroll on mobile
    if (isMobile) {
      document.body.style.overflow = '';
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 relative overflow-visible">
      {/* Dashboard Header */}
      {!hideHeader && (
        <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
      <div className="w-full px-4 md:px-6 py-4 overflow-visible">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedModules.map(m => m.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 gap-4">
              {orderedModules.map((module) => (
                <SortableItem key={module.id} id={module.id}>
                  <div className="w-full">
                    {expandedModuleId === module.id ? (
                      <div className={`${
                        isMobile 
                          ? 'fixed top-32 left-0 right-0 bottom-0 z-50 bg-background flex flex-col' 
                          : 'rounded-lg border border-border bg-background'
                      } ${isMobile ? '' : 'shadow-lg'}`}>
                        <div
                          className="flex items-center justify-between p-2 border-b cursor-pointer hover:bg-muted/40"
                          onClick={() => openModule(module.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                              <module.icon className={`h-4 w-4 text-${module.iconColor}-600`} />
                            </div>
                            <h3 className="text-xs font-medium">{module.title}</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedModuleId(null);
                              onExpandChange?.(null);
                              if (isMobile) {
                                document.body.style.overflow = '';
                              }
                            }}
                          >
                            Close
                          </Button>
                        </div>
                        <div className={`${
                          isMobile 
                            ? 'flex-1 overflow-y-auto px-4 py-3' 
                            : 'px-4 md:px-6 py-3'
                        }`}>
                          <module.component user={user} isFullPage={false} />
                        </div>
                      </div>
                    ) : (
                      <Card 
                        className="hover:shadow-lg transition-shadow cursor-pointer group"
                        onClick={() => openModule(module.id)}
                      >
                        <CardContent className="p-3 md:p-4">
                          <div className="flex items-center gap-3 mb-1">
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
                          
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {availableModules.length === 0 && (
          <div className="text-center py-12">
            <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No modules available</h3>
            <p className="text-sm text-muted-foreground">Contact an administrator to request module access</p>
          </div>
        )}
      </div>

    </div>
  );
};