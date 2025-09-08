import React, { useState, useMemo } from 'react';
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { useModuleOrdering } from "@/hooks/useModuleOrdering";
import { ModuleRegistry } from '@/utils/moduleRegistry';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SecurityDashboard from "@/components/admin/SecurityDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { AnnouncementsEventsSection } from "@/components/user-dashboard/sections/AnnouncementsEventsSection";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";
import { useNavigate } from "react-router-dom";
import { useState as reactUseState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleCard } from '@/components/shared/ModuleWrapper';
import { UNIFIED_MODULE_CATEGORIES } from '@/config/unified-modules';
import { Calendar, CheckCircle, DollarSign, Bell, Music, BookOpen, Clock, Award, Users, TrendingUp, Settings, Star, Shield, Database, BarChart3, FileText, AlertCircle, Crown, Server, Activity, Lock, GraduationCap, Grid3X3, ChevronDown, ChevronUp, GripVertical, Globe, Zap, Heart, Eye, Search, Filter, SortAsc, SortDesc } from "lucide-react";
const CalendarViewsLazy = lazy(() => import("@/components/calendar/CalendarViews").then(module => ({
  default: module.CalendarViews
})));

// Sortable Module Card Component
interface SortableModuleCardProps {
  module: any;
  onModuleClick: (moduleId: string) => void;
  navigate: (path: string) => void;
  isDragging?: boolean;
}
const SortableModuleCard = ({
  module,
  onModuleClick,
  navigate,
  isDragging
}: SortableModuleCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({
    id: module.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1
  };
  const IconComponent = module.icon;
  return <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={`cursor-pointer hover:shadow-md transition-all duration-200 ${isSortableDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              {IconComponent && <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                  <IconComponent className={`h-4 w-4 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                </div>}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
                  {module.title}
                </CardTitle>
                <CardDescription className="text-xs mt-1 line-clamp-2">
                  {module.description}
                </CardDescription>
              </div>
            </div>
            {module.isNew && <Badge variant="secondary" className="text-xs px-2 py-0.5 ml-2">
                New
              </Badge>}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="outline" size="sm" className="w-full" onClick={() => {
          if (module.id === 'librarian') {
            navigate('/librarian-dashboard');
          } else {
            onModuleClick(module.id);
          }
        }}>
            Open Module
          </Button>
        </CardContent>
      </Card>
    </div>;
};
interface SuperAdminDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}
export const SuperAdminDashboard = ({
  user
}: SuperAdminDashboardProps) => {
  console.log('SuperAdminDashboard: Component loaded with user:', user);
  const navigate = useNavigate();
  const {
    events: upcomingEvents
  } = usePublicGleeWorldEvents();

  // Get all modules available to super admin
  const {
    modules: allModules,
    categories,
    loading: modulesLoading,
    getModulesByCategory
  } = useUnifiedModules({
    userRole: 'super-admin',
    isAdmin: true
  });
  const {
    saveCategoryOrder
  } = useModuleOrdering(user.id);

  // Create modulesByCategory object from the function, enhanced with component data
  const modulesByCategory = useMemo(() => {
    try {
      const result: Record<string, any[]> = {};
      categories.forEach(category => {
        try {
          const modules = getModulesByCategory(category).map(module => {
            try {
              // Get the full module config from registry
              const moduleConfig = ModuleRegistry.getModule(module.id);
              if (!moduleConfig) {
                console.warn(`Module config not found for: ${module.id}`);
                return null;
              }
              return {
                ...module,
                icon: moduleConfig.icon,
                iconColor: moduleConfig.iconColor || 'blue',
                component: moduleConfig.component,
                isNew: moduleConfig.isNew || false
              };
            } catch (error) {
              console.error(`Error processing module ${module.id}:`, error);
              return null;
            }
          }).filter(module => module !== null && module.component !== undefined); // Filter out null modules and modules without components
          result[category] = modules;
        } catch (error) {
          console.error(`Error processing category ${category}:`, error);
          result[category] = [];
        }
      });
      return result;
    } catch (error) {
      console.error('Error in modulesByCategory useMemo:', error);
      return {};
    }
  }, [categories, getModulesByCategory]);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [overviewCollapsed, setOverviewCollapsed] = useState(true);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Initialize collapsed sections - default all categories to collapsed
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const initialCollapsed: Record<string, boolean> = {};
    categories.forEach(category => {
      initialCollapsed[category] = true; // Default to collapsed
    });
    return initialCollapsed;
  });

  // Sort and filter modules
  const filteredAndSortedModules = useMemo(() => {
    const allModules = Object.entries(modulesByCategory).flatMap(([category, modules]) => modules.map(module => ({
      ...module,
      category
    })));

    // Filter by search query
    let filtered = allModules.filter(module => module.title?.toLowerCase().includes(searchQuery.toLowerCase()) || module.description?.toLowerCase().includes(searchQuery.toLowerCase()) || module.category.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(module => module.category === filterCategory);
    }

    // Sort modules
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'status':
          aValue = a.isActive ? 'active' : 'inactive';
          bValue = b.isActive ? 'active' : 'inactive';
          break;
        default:
          aValue = a.title || '';
          bValue = b.title || '';
      }
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return filtered;
  }, [modulesByCategory, searchQuery, filterCategory, sortBy, sortOrder]);

  // Sort modules within categories based on custom ordering
  const sortedModulesByCategory = useMemo(() => {
    const result: Record<string, any[]> = {};

    // Add null check to prevent Object.entries error
    if (modulesByCategory && typeof modulesByCategory === 'object') {
      Object.entries(modulesByCategory).forEach(([category, categoryModules]) => {
        // For now, we'll keep the default order but this is where custom ordering would be applied
        result[category] = categoryModules ? [...categoryModules] : [];
      });
    }
    return result;
  }, [modulesByCategory]);

  // Format events for AnnouncementsEventsSection
  const formattedUpcomingEvents = upcomingEvents.filter(event => {
    // Filter out events with invalid dates
    const isValidDate = event.start_date && !isNaN(new Date(event.start_date).getTime());
    if (!isValidDate) {
      console.warn('Invalid date found in event:', event.id, event.start_date);
    }
    return isValidDate;
  }).slice(0, 6).map(event => ({
    id: event.id,
    title: event.title,
    date: event.start_date,
    location: event.location || event.venue_name || undefined,
    type: event.event_type || undefined
  }));
  const [superAdminData, setSuperAdminData] = useState({
    systemOverview: {
      totalUsers: 0,
      activeUsers: 0,
      systemUptime: 99.9,
      totalStorage: 500,
      usedStorage: 0
    },
    securityMetrics: {
      activeLogins: 0,
      failedLoginAttempts: 0,
      suspiciousActivity: 0,
      lastSecurityAudit: '2024-01-15'
    },
    administrativeStats: {
      totalAdmins: 0,
      superAdmins: 0,
      pendingPermissions: 0,
      systemAlerts: 0
    },
    globalMetrics: {
      totalEvents: 0,
      totalContracts: 0,
      totalRevenue: 0,
      membershipGrowth: 0
    },
    criticalTasks: [],
    recentActions: []
  });
  const [calendarCollapsed, setCalendarCollapsed] = useState(true);
  const [quickAccessCollapsed, setQuickAccessCollapsed] = useState(true);
  const [showAllModules, setShowAllModules] = useState(true);
  const handleDragEnd = (event: DragEndEvent, category: string) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const categoryModules = sortedModulesByCategory[category];
      const oldIndex = categoryModules.findIndex(module => module.id === active.id);
      const newIndex = categoryModules.findIndex(module => module.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(categoryModules, oldIndex, newIndex);
        const orderedModuleKeys = newOrder.map(module => module.id);

        // Save the new order
        saveCategoryOrder(category, orderedModuleKeys);
      }
    }
  };

  // Toggle section collapse
  const toggleSectionCollapse = (sectionName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };
  useEffect(() => {
    const fetchSuperAdminData = async () => {
      try {
        // Fetch user statistics
        const {
          count: totalUsers
        } = await supabase.from('gw_profiles').select('*', {
          count: 'exact',
          head: true
        });
        const {
          count: activeUsers
        } = await supabase.from('gw_profiles').select('*', {
          count: 'exact',
          head: true
        }).not('last_sign_in_at', 'is', null);
        const {
          count: totalAdmins
        } = await supabase.from('gw_profiles').select('*', {
          count: 'exact',
          head: true
        }).eq('is_admin', true);
        const {
          count: superAdmins
        } = await supabase.from('gw_profiles').select('*', {
          count: 'exact',
          head: true
        }).eq('is_super_admin', true);

        // Fetch global metrics
        const {
          count: totalEvents
        } = await supabase.from('gw_events').select('*', {
          count: 'exact',
          head: true
        });
        const {
          count: totalContracts
        } = await supabase.from('contracts_v2').select('*', {
          count: 'exact',
          head: true
        });

        // Fetch security events
        const {
          data: securityEvents
        } = await supabase.from('gw_security_audit_log').select('action_type, created_at').order('created_at', {
          ascending: false
        }).limit(10);
        const failedLogins = securityEvents?.filter(e => e.action_type.includes('failed') || e.action_type.includes('unauthorized')).length || 0;

        // Fetch recent admin actions
        const {
          data: adminActions
        } = await supabase.from('activity_logs').select('action_type, created_at, user_id').in('action_type', ['role_changed', 'user_created', 'user_deleted', 'admin_action']).order('created_at', {
          ascending: false
        }).limit(5);
        setSuperAdminData(prev => ({
          ...prev,
          systemOverview: {
            ...prev.systemOverview,
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            usedStorage: Math.round((totalUsers || 0) * 0.5) // Rough calculation
          },
          securityMetrics: {
            ...prev.securityMetrics,
            activeLogins: activeUsers || 0,
            failedLoginAttempts: failedLogins
          },
          administrativeStats: {
            ...prev.administrativeStats,
            totalAdmins: totalAdmins || 0,
            superAdmins: superAdmins || 0
          },
          globalMetrics: {
            ...prev.globalMetrics,
            totalEvents: totalEvents || 0,
            totalContracts: totalContracts || 0,
            membershipGrowth: 12.5 // TODO: Calculate real growth
          },
          recentActions: adminActions?.map((action, index) => ({
            id: String(index + 1),
            action: action.action_type.replace('_', ' '),
            target: 'User',
            timestamp: new Date(action.created_at).toLocaleString(),
            type: 'system'
          })) || []
        }));
      } catch (error) {
        console.error('Error fetching super admin data:', error);
      }
    };
    fetchSuperAdminData();
  }, []);

  // If a specific module is selected, show it full page
  if (selectedModule) {
    // Special handling for security dashboard
    if (selectedModule === 'security-dashboard') {
      return <div className="min-h-screen p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedModule(null)} className="p-0 h-auto">
              Super Admin Dashboard
            </Button>
            <span>/</span>
            <span className="text-foreground font-medium">Security Dashboard</span>
          </div>
          
          <SecurityDashboard />
        </div>;
    }
    const moduleConfig = ModuleRegistry.getModule(selectedModule);
    if (moduleConfig && moduleConfig.component) {
      const ModuleComponent = moduleConfig.component;
      return <div className="min-h-screen p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedModule(null)} className="p-0 h-auto">
              Super Admin Dashboard
            </Button>
            <span>/</span>
            <span className="text-foreground font-medium">{moduleConfig.title}</span>
          </div>
          
          <ModuleComponent user={{
          ...user,
          is_admin: true,
          is_super_admin: true
        }} isFullPage={true} onNavigate={(moduleId: string) => setSelectedModule(moduleId)} />
        </div>;
    }
  }
  return <div className="space-y-4">
      {/* Header with Module Toggle */}
      <div className="flex items-center justify-between">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-purple-600" />
            Super Admin Dashboard
          </h1>
          
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search modules..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => <SelectItem key={category} value={category}>
                    {category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: 'name' | 'category' | 'status') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-2">
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>

          {/* Filtered Results Count */}
          {searchQuery || filterCategory !== 'all' ? <div className="mt-4 text-sm text-muted-foreground">
              Found {filteredAndSortedModules.length} modules
              {searchQuery && ` matching "${searchQuery}"`}
              {filterCategory !== 'all' && ` in ${filterCategory.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`}
            </div> : null}
        </Card>

      {/* All Modules Display */}
      <div className="space-y-6">
          {/* Always show search results when there's a search query or filter */}
          {searchQuery.trim() || filterCategory !== 'all' ? <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  {searchQuery.trim() ? 'Search Results' : 'Filtered Results'}
                </CardTitle>
                <CardDescription>
                  {filteredAndSortedModules.length} modules found
                  {searchQuery.trim() && ` for "${searchQuery}"`}
                  {filterCategory !== 'all' && ` in ${filterCategory.replace('_', ' ')}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAndSortedModules.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAndSortedModules.map(module => <SortableModuleCard key={module.id} module={module} onModuleClick={moduleId => setSelectedModule(moduleId)} navigate={navigate} />)}
                  </div> : <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No modules found</h3>
                    <p className="text-sm">
                      Try adjusting your search criteria or clearing the filters
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => {
              setSearchQuery('');
              setFilterCategory('all');
            }}>
                      Clear Search
                    </Button>
                  </div>}
              </CardContent>
            </Card> :
      // Show modules by category when no search/filter is active
      categories.map(category => {
        const categoryModules = sortedModulesByCategory[category];
        if (!categoryModules || categoryModules.length === 0) return null;
        const categoryData = UNIFIED_MODULE_CATEGORIES.find(c => c.id === category);
        const IconComponent = categoryData?.icon || Settings;
        const isCollapsed = collapsedSections[category];
        return <Card key={category} className="overflow-hidden">
                  <Collapsible open={!isCollapsed} onOpenChange={() => toggleSectionCollapse(category)}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-${categoryData?.color || 'blue'}-100 dark:bg-${categoryData?.color || 'blue'}-900/20`}>
                              <IconComponent className={`h-5 w-5 text-${categoryData?.color || 'blue'}-600 dark:text-${categoryData?.color || 'blue'}-400`} />
                            </div>
                            <div className="text-left">
                              <CardTitle className="text-lg">{categoryData?.title || category}</CardTitle>
                              <CardDescription>
                                {categoryData?.description || `${categoryModules.length} modules available`}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {categoryModules.length} modules
                            </Badge>
                            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => handleDragEnd(event, category)}>
                          <SortableContext items={categoryModules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {categoryModules.map(module => <SortableModuleCard key={module.id} module={module} onModuleClick={moduleId => setSelectedModule(moduleId)} navigate={navigate} />)}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>;
      })}
        </div>

      {/* All Modules View */}
      <div className="space-y-8">
          {modulesLoading ? <div className="text-center py-8 text-lg">Loading modules...</div> : (() => {
        // Sort categories to prioritize important ones at the top
        const sortedEntries = Object.entries(sortedModulesByCategory).sort(([categoryA], [categoryB]) => {
          // Define priority order - put most important categories first
          const priorityOrder = ['user-management', 'music', 'administrative', 'events', 'communications', 'financial'];
          const priorityA = priorityOrder.indexOf(categoryA);
          const priorityB = priorityOrder.indexOf(categoryB);

          // If both are in priority list, sort by priority order
          if (priorityA !== -1 && priorityB !== -1) {
            return priorityA - priorityB;
          }
          // If only A is in priority list, A comes first
          if (priorityA !== -1) return -1;
          // If only B is in priority list, B comes first  
          if (priorityB !== -1) return 1;
          // If neither is in priority list, sort alphabetically
          return categoryA.localeCompare(categoryB);
        });
        return sortedEntries.map(([categoryName, categoryModules]) => {
          const categoryConfig = UNIFIED_MODULE_CATEGORIES.find(c => c.id === categoryName);
          const IconComponent = categoryConfig?.icon || Users;
          const isCollapsed = collapsedSections[categoryName];
          const isSingleModule = categoryModules.length === 1;
          if (categoryModules.length === 0) return null;
          return <div key={categoryName} className="space-y-3">
                  {/* Category Header */}
                  <Collapsible open={!isCollapsed} onOpenChange={open => {
              if (!isSingleModule) {
                setCollapsedSections(prev => ({
                  ...prev,
                  [categoryName]: !open
                }));
              }
            }}>
                    <CollapsibleTrigger className={`w-full ${isSingleModule ? 'cursor-default' : 'cursor-pointer'}`} disabled={isSingleModule}>
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <h3 className="font-semibold text-base lg:text-lg">
                              {categoryConfig?.title || categoryName.charAt(0).toUpperCase() + categoryName.slice(1).replace('-', ' ')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {categoryConfig?.description || `Administrative modules for ${categoryName}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-medium">
                            {categoryModules.length} module{categoryModules.length !== 1 ? 's' : ''}
                          </Badge>
                          {!isSingleModule && (isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-3">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => handleDragEnd(event, categoryName)}>
                        <SortableContext items={categoryModules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                            {categoryModules.map(module => <SortableModuleCard key={module.id} module={module} onModuleClick={moduleId => setSelectedModule(moduleId)} navigate={navigate} />)}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </CollapsibleContent>
                  </Collapsible>
                </div>;
        });
      })()}
        </div>) : (/* Dashboard Overview */
    <div className="space-y-6">

          {/* Overview Cards Section - moved to bottom */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl lg:text-2xl font-semibold">System Overview</h2>
              <Button variant="ghost" size="sm" onClick={() => setOverviewCollapsed(!overviewCollapsed)} className="flex items-center gap-2">
                {overviewCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {overviewCollapsed ? 'Expand' : 'Collapse'}
              </Button>
            </div>
            
            {!overviewCollapsed && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* System Overview Card */}
                <Card className="border-2 border-purple-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-base lg:text-lg font-medium">System Overview</CardTitle>
                    <Crown className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl lg:text-4xl font-bold">{superAdminData.systemOverview.systemUptime}%</div>
                    <p className="text-sm lg:text-base text-muted-foreground">System uptime</p>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm lg:text-base">
                        <span>Total Users</span>
                        <span>{superAdminData.systemOverview.totalUsers}</span>
                      </div>
                      <div className="flex justify-between text-sm lg:text-base">
                        <span>Active Now</span>
                        <span>{superAdminData.systemOverview.activeUsers}</span>
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
                    <div className="text-2xl font-bold">{superAdminData.securityMetrics.suspiciousActivity}</div>
                    <p className="text-xs text-muted-foreground">Suspicious activities</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Active Logins</span>
                        <span>{superAdminData.securityMetrics.activeLogins}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Failed Attempts</span>
                        <span>{superAdminData.securityMetrics.failedLoginAttempts}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Administrative Stats Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Administrative Stats</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{superAdminData.administrativeStats.totalAdmins}</div>
                    <p className="text-xs text-muted-foreground">Total administrators</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Super Admins</span>
                        <span>{superAdminData.administrativeStats.superAdmins}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Pending Permissions</span>
                        <span>{superAdminData.administrativeStats.pendingPermissions}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Storage Usage Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{superAdminData.systemOverview.usedStorage}GB</div>
                    <p className="text-xs text-muted-foreground">
                      of {superAdminData.systemOverview.totalStorage}GB used
                    </p>
                    <Progress value={superAdminData.systemOverview.usedStorage / superAdminData.systemOverview.totalStorage * 100} className="mt-2" />
                  </CardContent>
                </Card>

                {/* Global Metrics Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Global Metrics</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{superAdminData.globalMetrics.membershipGrowth}%</div>
                    <p className="text-xs text-muted-foreground">Membership growth</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Total Events</span>
                        <span>{superAdminData.globalMetrics.totalEvents}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Total Revenue</span>
                        <span>${superAdminData.globalMetrics.totalRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Tasks Card */}
                <Card className="border-2 border-yellow-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Critical Tasks</CardTitle>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{superAdminData.criticalTasks.length}</div>
                    <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                    <div className="mt-2 space-y-2">
                      {superAdminData.criticalTasks.map(task => <div key={task.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium truncate">{task.title}</span>
                          <Badge variant={task.priority === 'critical' ? 'destructive' : 'secondary'}>
                            {task.priority}
                          </Badge>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>

                {/* Super Admin Actions Card */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Recent Super Admin Actions</CardTitle>
                    <CardDescription>Latest system-level administrative actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {superAdminData.recentActions.map(action => <div key={action.id} className="flex items-center gap-3">
                          <Crown className="h-5 w-5 text-purple-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{action.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {action.target} • {action.timestamp}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {action.type}
                          </Badge>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>


                {/* Announcements Section */}
                <div className="md:col-span-2 lg:col-span-3">
                  <div className="grid grid-cols-1 gap-6">
                    <AnnouncementsEventsSection upcomingEvents={formattedUpcomingEvents} />
                  </div>
                  {/* Unified Calendar for Super Admins (collapsed by default) */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-base">Glee Calendar</CardTitle>
                      <Button variant="ghost" size="sm" aria-controls="superadmin-glee-calendar" aria-expanded={!calendarCollapsed} onClick={() => setCalendarCollapsed(v => !v)}>
                        {calendarCollapsed ? 'Expand' : 'Collapse'}
                      </Button>
                    </div>
                    {!calendarCollapsed && <Suspense fallback={<Card className="glass-dashboard-card">
                          <CardHeader>
                            <CardTitle>Glee Calendar</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="py-6">Loading calendar…</div>
                          </CardContent>
                        </Card>}>
                        <div id="superadmin-glee-calendar">
                          <CalendarViewsLazy />
                        </div>
                      </Suspense>}
                  </div>
                </div>

                {/* System Administration Section - At Bottom */}
                <div className="md:col-span-2 lg:col-span-3 mt-8">
                  <Card className="border-2 border-red-100 dark:border-red-900/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <Lock className="h-5 w-5" />
                        System Administration
                      </CardTitle>
                      <CardDescription>
                        Platform settings, logs, and administrative tools
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Platform Settings */}
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4 text-blue-600" />
                              <CardTitle className="text-sm">Platform Settings</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-3">Configure system-wide settings and parameters</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>Environment</span>
                                <Badge variant="outline">Production</Badge>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>Maintenance Mode</span>
                                <Badge variant="outline">Off</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* System Logs */}
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <CardTitle className="text-sm">System Logs</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-3">View application and system logs</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>Error Logs</span>
                                <Badge variant="destructive">2</Badge>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>Access Logs</span>
                                <Badge variant="outline">Live</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Database Admin */}
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-purple-600" />
                              <CardTitle className="text-sm">Database Admin</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-3">Direct database management and queries</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>Connection Status</span>
                                <Badge variant="outline" className="text-green-600">Connected</Badge>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>Total Tables</span>
                                <span>47</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Security Audit */}
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-red-600" />
                              <CardTitle className="text-sm">Security Audit</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-3">Security scanning and vulnerability assessment</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>Last Scan</span>
                                <span>2h ago</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>Security Score</span>
                                <Badge variant="outline" className="text-green-600">98/100</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Performance Monitor */}
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-orange-600" />
                              <CardTitle className="text-sm">Performance Monitor</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-3">System performance metrics and monitoring</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>CPU Usage</span>
                                <span>23%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>Memory Usage</span>
                                <span>45%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* System Actions */}
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-purple-600" />
                              <CardTitle className="text-sm">Admin Actions</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-3">Critical system administration actions</p>
                            <div className="space-y-2">
                              <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => navigate('/admin/alumnae')}>
                                <GraduationCap className="mr-2 h-3 w-3" />
                                Alumnae Portal
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>}
          </div>
        </div>
    </div>;
};