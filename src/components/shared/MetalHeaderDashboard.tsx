import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardHeroCarousel } from "@/components/dashboard/DashboardHeroCarousel";
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { useModuleOrdering } from "@/hooks/useModuleOrdering";
import { useModuleFavorites } from "@/hooks/useModuleFavorites";
import { useMemberQuickActions } from "@/hooks/useMemberQuickActions";
import { useDashboardCardOrder } from "@/hooks/useDashboardCardOrder";
import { useUserRole } from "@/hooks/useUserRole";
import { ModuleRegistry } from '@/utils/moduleRegistry';
import { STANDARD_MEMBER_MODULE_IDS } from '@/config/executive-modules';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { FavoritesCard } from "@/components/dashboard/FavoritesCard";
import { MemberModulesCard } from "@/components/dashboard/MemberModulesCard";
import { ExecBoardModulesCard } from "@/components/dashboard/ExecBoardModulesCard";
import { AllModulesCard } from "@/components/dashboard/AllModulesCard";
import { AnnouncementsTicker } from "@/components/dashboard/AnnouncementsTicker";
import { Calendar, Search, Filter, SortAsc, SortDesc, ChevronDown, ChevronUp, GripVertical, Pin, PinOff, Shield, Clock, BarChart3, GraduationCap, Key, Heart, Star, MessageSquare, Bot, Sparkles, Edit3, RotateCcw, Save, Megaphone } from "lucide-react";

// Sortable Dashboard Card Component
interface SortableDashboardCardProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}
const SortableDashboardCard = ({
  id,
  children,
  disabled
}: SortableDashboardCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    disabled
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  if (disabled) {
    return <div className="relative">{children}</div>;
  }
  return <div ref={setNodeRef} style={style} className="relative group">
      <div className="absolute -left-2 top-0 bottom-0 w-10 flex items-center justify-center z-50 cursor-grab active:cursor-grabbing bg-primary/10 hover:bg-primary/20 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
        <GripVertical className="h-6 w-6 text-primary" />
      </div>
      {children}
    </div>;
};

// Sortable Module Card Component
interface SortableModuleCardProps {
  module: any;
  onModuleClick: (moduleId: string) => void;
  navigate: (path: string) => void;
  isDragging?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}
const SortableModuleCard = ({
  module,
  onModuleClick,
  navigate,
  isDragging,
  isPinned = false,
  onTogglePin,
  isFavorite = false,
  onToggleFavorite
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
      <Card className={`cursor-pointer hover:shadow-md transition-all duration-200 bg-background/95 backdrop-blur-sm border-2 ${isSortableDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`} onClick={() => {
      if (module.id === 'librarian') {
        navigate('/librarian-dashboard');
      } else {
        onModuleClick(module.id);
      }
    }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded" onClick={e => e.stopPropagation()}>
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={e => {
              e.stopPropagation();
              onToggleFavorite?.();
            }} className={`p-1 h-auto ${isFavorite ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500 transition-colors`}>
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={e => {
              e.stopPropagation();
              onTogglePin?.();
            }} className={`p-1 h-auto ${isPinned ? 'text-primary' : 'text-muted-foreground'}`}>
                {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </Button>
              {module.isNew && <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  New
                </Badge>}
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>;
};
interface MetalHeaderDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
  simulatedRole?: string; // Optional role to simulate for viewing purposes
  simulatedUserId?: string; // When simulating, fetch grants for this user id
  onToggleMessages?: () => void; // Callback to toggle messages panel
  className?: string; // Optional className for styling
}
export const MetalHeaderDashboard = ({
  user,
  simulatedRole,
  simulatedUserId,
  onToggleMessages,
  className
}: MetalHeaderDashboardProps) => {
  const navigate = useNavigate();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const {
    isSuperAdmin
  } = useUserRole();
  const {
    cardOrder,
    saveCardOrder,
    resetCardOrder,
    isSaving
  } = useDashboardCardOrder();

  // Get the user's first name from full_name
  const getFirstName = (fullName: string) => {
    return fullName?.split(' ')[0] || 'User';
  };

  // Get user role for module permissions
  const getUserRole = () => {
    // If simulating a role, use that instead of actual role
    if (simulatedRole) return simulatedRole;
    if (user.role === 'super-admin') return 'super-admin';
    if (user.role === 'admin') return 'admin';
    if (user.is_exec_board) return 'executive';
    return user.role || 'user';
  };
  const isAdmin = simulatedRole ? false : user.role === 'super-admin' || user.role === 'admin';

  // Get modules available to this user - ONLY modules they have access to
  const {
    modules: allModules,
    categories,
    loading: modulesLoading,
    getModulesByCategory,
    getAccessibleModules,
    getModuleById
  } = useUnifiedModules({
    userRole: getUserRole(),
    userId: simulatedRole ? simulatedUserId : user.id,
    // Use simulated student's grants when simulating
    isAdmin: simulatedRole ? false : isAdmin,
    showInactive: false // Only show active modules user can access
  });
  const {
    saveCategoryOrder,
    toggleModulePin,
    isModulePinned
  } = useModuleOrdering(simulatedRole ? undefined : user.id); // Don't use personal ordering when simulating
  const {
    favorites: moduleFavorites,
    toggleFavorite,
    isFavorite
  } = useModuleFavorites(simulatedRole ? undefined : user.id); // Don't use personal favorites when simulating
  const {
    quickActions: memberQuickActions,
    loading: quickActionsLoading,
    isMember,
    addQuickAction,
    removeQuickAction,
    isInQuickActions,
    getVisibleQuickActions
  } = useMemberQuickActions(simulatedRole ? undefined : user.id, simulatedRole || user.role); // Don't use personal quick actions when simulating

  // Navigation hooks
  const location = useLocation();

  // State management
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Initialize selected module from URL on component mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleFromUrl = params.get('module');
    if (moduleFromUrl) {
      setSelectedModule(moduleFromUrl);
    }
  }, [location.search]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Ensure categories default to collapsed on load (without causing loops)
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    setCollapsedSections(prev => {
      let changed = false;
      const next = {
        ...prev
      } as Record<string, boolean>;
      categories.forEach(categoryId => {
        if (next[categoryId] === undefined) {
          next[categoryId] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [categories]);
  const [filterControlsCollapsed, setFilterControlsCollapsed] = useState(true);
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);

  // Card ordering sensors for drag and drop
  const cardSensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleCardDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cardOrder.indexOf(active.id as string);
      const newIndex = cardOrder.indexOf(over.id as string);
      const newOrder = arrayMove(cardOrder, oldIndex, newIndex);
      saveCardOrder(newOrder);
    }
  };
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  // Create modulesByCategory object - ONLY show modules user can access
  const modulesByCategory = useMemo(() => {
    try {
      const result: Record<string, any[]> = {};
      const accessibleModules = getAccessibleModules();
      categories.forEach(category => {
        try {
          const modules = accessibleModules.filter(m => m.category === category).map(module => {
            try {
              const moduleConfig = ModuleRegistry.getModule(module.id);
              if (!moduleConfig) {
                console.warn(`Module config not found for: ${module.id}, using fallback`);
                return {
                  ...module,
                  icon: (module as any).icon || Calendar,
                  iconColor: (module as any).iconColor || 'blue',
                  component: null,
                  isNew: false
                };
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
              return {
                ...module,
                icon: (module as any).icon || Calendar,
                iconColor: (module as any).iconColor || 'blue',
                component: null,
                isNew: false
              };
            }
          }).filter(Boolean);
          if (modules.length > 0) {
            result[category] = modules;
          }
        } catch (error) {
          console.error(`Error processing category ${category}:`, error);
        }
      });
      return result;
    } catch (error) {
      console.error('Error in modulesByCategory useMemo:', error);
      return {};
    }
  }, [categories, getAccessibleModules]);

  // Group modules for members: Show ALL accessible modules from permissions
  const groupedModules = useMemo(() => {
    if (!isMember) return null;
    const accessibleModules = getAccessibleModules();
    const visibleQuickActionModuleIds = getVisibleQuickActions().map(qa => qa.module_id);

    // Favorites group - show ALL favorited modules, not just quick actions
    const favoritesGroup = accessibleModules.filter(m => isFavorite(m.id)).map(module => {
      const moduleConfig = ModuleRegistry.getModule(module.id);
      return {
        ...module,
        icon: moduleConfig?.icon || Calendar,
        iconColor: moduleConfig?.iconColor || 'blue',
        component: moduleConfig?.component,
        isNew: moduleConfig?.isNew || false
      };
    });

    // Communications group (modules in 'communications' category)
    const communicationsGroup = accessibleModules.filter(m => m.category === 'communications' && visibleQuickActionModuleIds.includes(m.id)).map(module => {
      const moduleConfig = ModuleRegistry.getModule(module.id);
      return {
        ...module,
        icon: moduleConfig?.icon || Calendar,
        iconColor: moduleConfig?.iconColor || 'blue',
        component: moduleConfig?.component,
        isNew: moduleConfig?.isNew || false
      };
    });

    // Other assigned modules (not in favorites or communications)
    const otherGroup = accessibleModules.filter(m => visibleQuickActionModuleIds.includes(m.id) && !isFavorite(m.id) && m.category !== 'communications').map(module => {
      const moduleConfig = ModuleRegistry.getModule(module.id);
      return {
        ...module,
        icon: moduleConfig?.icon || Calendar,
        iconColor: moduleConfig?.iconColor || 'blue',
        component: moduleConfig?.component,
        isNew: moduleConfig?.isNew || false
      };
    });

    // All other accessible modules (not in favorites/communications/other groups)
    const existingIds = new Set([...favoritesGroup.map(m => m.id), ...communicationsGroup.map(m => m.id), ...otherGroup.map(m => m.id)]);
    const remainingModules = accessibleModules.filter(m => !existingIds.has(m.id)).map(module => {
      const moduleConfig = ModuleRegistry.getModule(module.id);
      return {
        ...module,
        icon: moduleConfig?.icon || Calendar,
        iconColor: moduleConfig?.iconColor || 'blue',
        component: moduleConfig?.component,
        isNew: moduleConfig?.isNew || false
      };
    });
    console.log('🔍 Module grouping:', {
      accessibleModuleCount: accessibleModules.length,
      favoritesCount: favoritesGroup.length,
      communicationsCount: communicationsGroup.length,
      otherCount: otherGroup.length,
      remainingCount: remainingModules.length,
      allModuleIds: accessibleModules.map(m => m.id)
    });
    return {
      favorites: favoritesGroup,
      communications: communicationsGroup,
      other: otherGroup,
      remaining: remainingModules,
      allModules: [...favoritesGroup, ...communicationsGroup, ...otherGroup, ...remainingModules]
    };
  }, [isMember, getAccessibleModules, getVisibleQuickActions, isFavorite]);

  // Sort and filter modules (for non-members or search/filter)
  const filteredAndSortedModules = useMemo(() => {
    const allModules = Object.entries(modulesByCategory).flatMap(([category, modules]) => modules.map(module => ({
      ...module,
      category
    })));
    let filtered = allModules.filter(module => module.title?.toLowerCase().includes(searchQuery.toLowerCase()) || module.description?.toLowerCase().includes(searchQuery.toLowerCase()) || module.category.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterCategory !== 'all') {
      filtered = filtered.filter(module => module.category === filterCategory);
    }
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

  // Sort modules within categories based on custom ordering and pinning
  const sortedModulesByCategory = useMemo(() => {
    const result: Record<string, any[]> = {};
    if (modulesByCategory && typeof modulesByCategory === 'object') {
      Object.entries(modulesByCategory).forEach(([category, categoryModules]) => {
        if (!categoryModules) {
          result[category] = [];
          return;
        }
        const pinnedModules = categoryModules.filter(module => isModulePinned(category, module.id));
        const unpinnedModules = categoryModules.filter(module => !isModulePinned(category, module.id));
        result[category] = [...pinnedModules, ...unpinnedModules];
      });
    }
    return result;
  }, [modulesByCategory, isModulePinned]);
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
        saveCategoryOrder(category, orderedModuleKeys);
      }
    }
  };
  const toggleSectionCollapse = (sectionName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Module selection handlers with URL persistence
  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    // Update URL with module parameter
    const params = new URLSearchParams(location.search);
    params.set('module', moduleId);
    navigate(`${location.pathname}?${params.toString()}`, {
      replace: true
    });
  };
  const handleBackToModules = () => {
    setSelectedModule(null);
    // Remove module parameter from URL
    const params = new URLSearchParams(location.search);
    params.delete('module');
    const newSearch = params.toString();
    navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, {
      replace: true
    });
  };

  // If a module is selected, render it with back button
  if (selectedModule) {
    // Try to get module from registry first, then fall back to unified modules
    let moduleConfig = ModuleRegistry.getModule(selectedModule);

    // Fallback: check UNIFIED_MODULES directly if not in registry yet
    if (!moduleConfig) {
      const unifiedModule = UNIFIED_MODULES.find(m => m.id === selectedModule || m.name === selectedModule);
      if (unifiedModule) {
        moduleConfig = {
          id: unifiedModule.id,
          title: unifiedModule.title,
          description: unifiedModule.description,
          icon: unifiedModule.icon,
          iconColor: unifiedModule.iconColor,
          category: unifiedModule.category,
          isNew: unifiedModule.isNew,
          component: unifiedModule.component,
          fullPageComponent: unifiedModule.fullPageComponent
        };
      }
    }
    if (moduleConfig?.component) {
      const ModuleComponent = moduleConfig.component;
      return <div className="space-y-6 relative min-h-screen">
          
          <div className="relative z-10 space-y-4">
            {/* Module Header with Back Button */}
            <div className="flex items-center justify-between gap-2 py-3 px-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {moduleConfig.title}
              </h1>
              <Button variant="ghost" size="sm" onClick={handleBackToModules} className="flex items-center gap-1 text-foreground hover:text-foreground/80 shrink-0">
                <span className="hidden sm:inline">← Back to Dashboard</span>
                <span className="sm:hidden">← Back</span>
              </Button>
            </div>
            
            {/* Module Content */}
            <ModuleComponent user={{
            ...user,
            is_admin: isAdmin,
            is_super_admin: user.role === 'super-admin'
          }} isFullPage={true} onNavigate={handleModuleSelect} />
          </div>
        </div>;
    }
  }
  // All users get the full metal header dashboard experience
  return <div className="space-y-6 relative min-h-screen max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Metal Plate Header */}
      <div className="relative z-10 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-700 rounded-lg border-2 border-slate-400 dark:border-slate-500 shadow-lg py-4 px-3 sm:px-5 text-slate-800 dark:text-slate-100 flex items-center justify-between min-h-[56px]">
        {/* Left Rivet - Hidden on mobile */}
        <div className="hidden sm:block absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
          <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        {/* Right Rivet - Hidden on mobile */}
        <div className="hidden sm:block absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
          <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Personalized Title - Left aligned on mobile, centered on desktop */}
        <h1 className="text-base sm:text-xl lg:text-2xl font-bold tracking-wide font-mono uppercase text-black truncate flex-1 text-center sm:pl-8">
          {getFirstName(user.full_name)}'s Dashboard
        </h1>

        {/* Key Ignition - Quick Actions Button */}
        <button 
          onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)} 
          className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 dark:from-amber-500 dark:via-yellow-600 dark:to-amber-700 rounded-full border-2 border-amber-600 dark:border-amber-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group shrink-0 ml-2 sm:mr-6"
          aria-label="Quick Actions"
        >
          <Key className={`h-4 w-4 text-amber-900 dark:text-amber-100 transition-transform duration-300 ${isQuickActionsOpen ? 'rotate-90' : ''}`} />
        </button>

        {/* Quick Actions Panel - slides out from underneath */}
        <QuickActionsPanel user={user} onModuleSelect={handleModuleSelect} isOpen={isQuickActionsOpen} onClose={() => setIsQuickActionsOpen(false)} quickActions={isMember ? {
        addQuickAction,
        removeQuickAction,
        isInQuickActions
      } : undefined} />
      </div>


      {/* Dashboard Hero Carousel */}
      <DashboardHeroCarousel />

      {/* Message Center Button with Announcements Ticker */}
      <div className="flex items-center mb-4 gap-0">
        {/* Announcements Ticker - Desktop only */}
        <div className="hidden lg:flex items-center flex-1 overflow-hidden">
          <div className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 w-full overflow-hidden">
            <Megaphone className="w-4 h-4 text-primary shrink-0" />
            <div className="overflow-hidden flex-1">
              <AnnouncementsTicker className="bg-white/[0.83] rounded-sm shadow" />
            </div>
          </div>
        </div>
        
        {/* Messages Button */}
        <Button onClick={() => onToggleMessages?.()} className="shadow-lg bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90 text-white font-semibold flex items-center gap-2 py-2 px-[8px] shrink-0 bg-secondary">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm">MESSAGES</span>
        </Button>
      </div>

      {/* Super Admin Layout Controls */}
      {isSuperAdmin() && <div className="flex items-center gap-2 justify-end">
          
          {isEditingLayout && <Button variant="ghost" size="sm" onClick={() => resetCardOrder()} disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>}
        </div>}


      {/* Edit Mode Banner */}
      {isEditingLayout && <Card className="bg-primary/10 border-primary">
          <CardContent className="py-3 px-4">
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <GripVertical className="h-4 w-4" />
              Drag and drop mode active - Hover over cards to see drag handles
            </p>
          </CardContent>
        </Card>}

      {/* Draggable Dashboard Cards */}
      <DndContext sensors={cardSensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
        <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {cardOrder.map(cardId => {
            // Favorites card using moduleFavorites
            if (cardId === 'favorites') {
              const hasFavorites = moduleFavorites && moduleFavorites.size > 0;

              // Convert moduleFavorites Set to array of enriched modules
              const favoritesArray = hasFavorites ? Array.from(moduleFavorites).map(moduleId => {
                const module = allModules.find(m => m.id === moduleId);
                if (!module) return null;
                const moduleConfig = ModuleRegistry.getModule(moduleId);
                return {
                  ...module,
                  icon: moduleConfig?.icon || Calendar,
                  iconColor: moduleConfig?.iconColor || 'blue',
                  component: moduleConfig?.component,
                  isNew: moduleConfig?.isNew || false
                };
              }).filter(Boolean) : [];
              return <SortableDashboardCard key={cardId} id={cardId} disabled={!isEditingLayout}>
                    <FavoritesCard favorites={favoritesArray as any} onModuleClick={handleModuleSelect} onToggleFavorite={toggleFavorite} />
                  </SortableDashboardCard>;
            }
            if (cardId === 'modules') {
              return <SortableDashboardCard key={cardId} id={cardId} disabled={!isEditingLayout}>
                    <AllModulesCard modules={allModules} onModuleClick={handleModuleSelect} navigate={navigate} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
                  </SortableDashboardCard>;
            }
            return null;
          })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Favorites Section - Hidden, now handled by draggable FavoritesCard */}
      {false && moduleFavorites.size > 0 && <Collapsible open={!favoritesCollapsed} onOpenChange={open => setFavoritesCollapsed(!open)}>
            <Card className="overflow-hidden bg-background/95 backdrop-blur-sm border-2 border-primary/20">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-1 hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardTitle className="text-xs flex items-center gap-1 justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 text-primary fill-current" />
                      Favorites
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                        {moduleFavorites.size}
                      </Badge>
                    </div>
                    {favoritesCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {Array.from(moduleFavorites).map(moduleId => {
                const module = allModules.find(m => m.id === moduleId);
                if (!module) return null;
                const moduleConfig = ModuleRegistry.getModule(moduleId);
                const enrichedModule = {
                  ...module,
                  icon: moduleConfig?.icon || Calendar,
                  iconColor: moduleConfig?.iconColor || 'blue',
                  component: moduleConfig?.component,
                  isNew: moduleConfig?.isNew || false
                };
                return <Card key={moduleId} className="cursor-pointer hover:shadow-md transition-all duration-200 bg-background/95 backdrop-blur-sm border" onClick={() => handleModuleSelect(moduleId)}>
                          <CardHeader className="pb-1 pt-1.5 px-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-1.5 flex-1">
                                {enrichedModule.icon && <div className={`p-1 rounded bg-${enrichedModule.iconColor}-100 dark:bg-${enrichedModule.iconColor}-900/20`}>
                                    <enrichedModule.icon className={`h-2 w-2 text-${enrichedModule.iconColor}-600 dark:text-${enrichedModule.iconColor}-400`} />
                                  </div>}
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-[8px] font-medium leading-tight line-clamp-2">
                                    {enrichedModule.title}
                                  </CardTitle>
                                  
                                </div>
                              </div>
                              
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 px-2 pb-1.5">
                            
                          </CardContent>
                        </Card>;
              })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>}
    </div>;
};