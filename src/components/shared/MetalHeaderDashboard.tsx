import React, { useState, useMemo, useEffect } from 'react';
import gleeSculptureBg from '@/assets/glee-sculpture-bg.png';
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardHeroCarousel } from "@/components/dashboard/DashboardHeroCarousel";
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { useModuleOrdering } from "@/hooks/useModuleOrdering";
import { useModuleFavorites } from "@/hooks/useModuleFavorites";
import { useMemberQuickActions } from "@/hooks/useMemberQuickActions";
import { ModuleRegistry } from '@/utils/moduleRegistry';
import { STANDARD_MEMBER_MODULE_IDS } from '@/config/executive-modules';
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
import { AIAssistantDialog } from "@/components/dashboard/AIAssistantDialog";
import { AllModulesCard } from "@/components/dashboard/AllModulesCard";
import { Calendar, Search, Filter, SortAsc, SortDesc, ChevronDown, ChevronUp, GripVertical, Pin, PinOff, Shield, Clock, BarChart3, GraduationCap, Key, Heart, Star, MessageSquare, Bot, Sparkles } from "lucide-react";

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
      <Card 
        className={`cursor-pointer hover:shadow-md transition-all duration-200 bg-background/95 backdrop-blur-sm border-2 ${isSortableDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
        onClick={() => {
          if (module.id === 'librarian') {
            navigate('/librarian-dashboard');
          } else {
            onModuleClick(module.id);
          }
        }}
      >
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
}
export const MetalHeaderDashboard = ({
  user
}: MetalHeaderDashboardProps) => {
  const navigate = useNavigate();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // Get the user's first name from full_name
  const getFirstName = (fullName: string) => {
    return fullName?.split(' ')[0] || 'User';
  };

  // Get user role for module permissions
  const getUserRole = () => {
    if (user.role === 'super-admin') return 'super-admin';
    if (user.role === 'admin') return 'admin';
    if (user.is_exec_board) return 'executive';
    return user.role || 'user';
  };
  const isAdmin = user.role === 'super-admin' || user.role === 'admin';

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
    userId: user.id,
    isAdmin,
    showInactive: false // Only show active modules user can access
  });
  const {
    saveCategoryOrder,
    toggleModulePin,
    isModulePinned
  } = useModuleOrdering(user.id);
  const {
    favorites: moduleFavorites,
    toggleFavorite,
    isFavorite
  } = useModuleFavorites(user.id);
  const {
    quickActions: memberQuickActions,
    loading: quickActionsLoading,
    isMember,
    addQuickAction,
    removeQuickAction,
    isInQuickActions,
    getVisibleQuickActions
  } = useMemberQuickActions(user.id, user.role);

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
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
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
          const modules = accessibleModules
            .filter(m => m.category === category)
            .map(module => {
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

  // Default modules that all members should see
  const DEFAULT_MEMBER_MODULES: string[] = STANDARD_MEMBER_MODULE_IDS;

  // Group modules for members: Favorites, Communications, Other Assigned, and Default Modules
  const groupedModules = useMemo(() => {
    if (!isMember) return null;
    
    const accessibleModules = getAccessibleModules();
    const visibleQuickActionModuleIds = getVisibleQuickActions().map(qa => qa.module_id);
    
    // Favorites group - show ALL favorited modules, not just quick actions
    const favoritesGroup = accessibleModules.filter(m => 
      isFavorite(m.id)
    ).map(module => {
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
    const communicationsGroup = accessibleModules.filter(m => 
      m.category === 'communications' && visibleQuickActionModuleIds.includes(m.id)
    ).map(module => {
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
    const otherGroup = accessibleModules.filter(m => 
      visibleQuickActionModuleIds.includes(m.id) &&
      !isFavorite(m.id) &&
      m.category !== 'communications'
    ).map(module => {
      const moduleConfig = ModuleRegistry.getModule(module.id);
      return {
        ...module,
        icon: moduleConfig?.icon || Calendar,
        iconColor: moduleConfig?.iconColor || 'blue',
        component: moduleConfig?.component,
        isNew: moduleConfig?.isNew || false
      };
    });

    // Default modules - always shown to members
    // Fetch directly from registry to ensure they show even without explicit grants
    const defaultModules = DEFAULT_MEMBER_MODULES
      .map((id) => {
        const moduleConfig = ModuleRegistry.getModule(id);
        if (!moduleConfig) return null;
        
        return {
          id: moduleConfig.id,
          name: moduleConfig.title, // Use title as name
          title: moduleConfig.title,
          description: moduleConfig.description,
          category: moduleConfig.category,
          icon: moduleConfig.icon,
          iconColor: moduleConfig.iconColor || 'blue',
          component: moduleConfig.component,
          isNew: moduleConfig.isNew || false,
          isActive: true,
          canAccess: true,
          canManage: false,
          hasPermission: true
        };
      })
      .filter(Boolean);

    console.log('🔍 Default modules filtering:', {
      defaultModuleIds: DEFAULT_MEMBER_MODULES,
      accessibleModuleCount: accessibleModules.length,
      accessibleModuleIds: accessibleModules.map(m => ({ id: m.id, name: m.name })),
      defaultModulesFound: defaultModules.length,
      defaultModulesData: defaultModules.map(m => ({ id: m.id, title: m.title }))
    });

    // Create a Set of unique module IDs to avoid duplicates
    const existingIds = new Set([
      ...favoritesGroup.map(m => m.id),
      ...communicationsGroup.map(m => m.id),
      ...otherGroup.map(m => m.id)
    ]);

    // Add default modules that aren't already in other groups
    const uniqueDefaultModules = defaultModules.filter(m => !existingIds.has(m.id));

    return {
      favorites: favoritesGroup,
      communications: communicationsGroup,
      other: otherGroup,
      defaultModules: uniqueDefaultModules,
      allModules: [...favoritesGroup, ...communicationsGroup, ...otherGroup, ...uniqueDefaultModules]
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
    const moduleConfig = ModuleRegistry.getModule(selectedModule);
    if (moduleConfig?.component) {
      const ModuleComponent = moduleConfig.component;
      return <div className="space-y-6 relative min-h-screen">
          {/* Background Image */}
          <div
            className="fixed inset-0 z-0 opacity-35 dark:opacity-30 bg-cover bg-no-repeat pointer-events-none"
            style={{
              backgroundImage: `url(${gleeSculptureBg})`,
              backgroundPosition: 'center 15%'
            }}
          />
          
          <div className="relative z-10 space-y-4">
            {/* Module Header with Back Button */}
            <div className="flex items-center justify-between gap-2 py-3 px-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {moduleConfig.title}
              </h1>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToModules}
                className="flex items-center gap-1 text-foreground hover:text-foreground/80 shrink-0"
              >
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
  // Member simplified view: favorites card on top, search/filters, then module cards
  if (isMember) {
    return (
      <div className="space-y-4 relative min-h-screen">
        {/* Background Image */}
        <div
          className="fixed inset-0 z-0 opacity-35 dark:opacity-30 bg-cover bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: `url(${gleeSculptureBg})`,
            backgroundPosition: 'center 15%'
          }}
        />

        {/* Metal Plate Header */}
        <div className="relative z-10 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-700 rounded-lg border-2 border-slate-400 dark:border-slate-500 shadow-lg pt-[15px] px-5 pb-5">
          {/* Left Rivet */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
            <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>

          {/* Right Rivet */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
            <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>

          {/* Key Ignition - Top Right */}
          <button
            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
            className="absolute top-3 right-12 w-8 h-8 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 dark:from-amber-500 dark:via-yellow-600 dark:to-amber-700 rounded-full border-2 border-amber-600 dark:border-amber-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
          >
            <Key
              className={`h-4 w-4 text-amber-900 dark:text-amber-100 transition-transform duration-300 ${
                isQuickActionsOpen ? 'rotate-90' : ''
              }`}
            />
          </button>

          {/* Personalized Title */}
          <h1 className="text-xl lg:text-2xl font-bold text-center text-slate-800 dark:text-slate-100 tracking-wide font-mono uppercase">
            {getFirstName(user.full_name)}'s Dashboard
          </h1>

          {/* Quick Actions Panel - slides out from underneath */}
          <QuickActionsPanel
            user={user}
            onModuleSelect={handleModuleSelect}
            isOpen={isQuickActionsOpen}
            onClose={() => setIsQuickActionsOpen(false)}
            quickActions={isMember ? { addQuickAction, removeQuickAction, isInQuickActions } : undefined}
          />
        </div>

        {/* Dashboard Hero Carousel */}
        <div className="relative z-0">
          <DashboardHeroCarousel />
        </div>

        {/* Favorites Card */}
        {groupedModules && groupedModules.favorites.length > 0 && (
          <div className="relative z-10">
            <FavoritesCard
              favorites={groupedModules.favorites}
              onModuleClick={handleModuleSelect}
              onToggleFavorite={toggleFavorite}
            />
          </div>
        )}

        {/* AI Assistant & Message Center */}
        <Card className="relative z-10 p-4 bg-background/95 backdrop-blur-sm border-2 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => setAiAssistantOpen(true)}>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </div>
            <Input 
              placeholder="Ask AI Assistant or check messages..." 
              className="pl-14 cursor-pointer"
              readOnly
            />
          </div>
        </Card>

        {/* Search and Filter Tools */}
        <div className="relative z-10 space-y-3">
          {/* Search Field */}
          <Card className="p-4 bg-background/95 backdrop-blur-sm border-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search modules..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-10" 
              />
            </div>
          </Card>

          {/* Filter Controls */}
          <Card className="bg-background/95 backdrop-blur-sm border-2">
            <Collapsible open={!filterControlsCollapsed} onOpenChange={() => setFilterControlsCollapsed(!filterControlsCollapsed)}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">Filters & Sorting</span>
                  </div>
                  {filterControlsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Order</label>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? (
                        <>
                          <SortAsc className="h-4 w-4 mr-2" />
                          Ascending
                        </>
                      ) : (
                        <>
                          <SortDesc className="h-4 w-4 mr-2" />
                          Descending
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>

        {/* Module Overview Cards */}
        <div className="relative z-10 grid grid-cols-1 gap-4">
          <MemberModulesCard userId={user.id} />
          <ExecBoardModulesCard userId={user.id} />
        </div>
      </div>
    );
  }

  return <div className="space-y-4 relative min-h-screen">
      {/* Background Image */}
      <div className="fixed inset-0 z-0 opacity-35 dark:opacity-30 bg-cover bg-no-repeat pointer-events-none" style={{
      backgroundImage: `url(${gleeSculptureBg})`,
      backgroundPosition: 'center 15%'
    }} />
      {/* Metal Plate Header */}
      <div className="relative z-10 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-700 rounded-lg border-2 border-slate-400 dark:border-slate-500 shadow-lg pt-[15px] px-5 pb-5">
        {/* Left Rivet */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
          <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        {/* Right Rivet */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
          <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Key Ignition - Top Right */}
        <button onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)} className="absolute top-3 right-12 w-8 h-8 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 dark:from-amber-500 dark:via-yellow-600 dark:to-amber-700 rounded-full border-2 border-amber-600 dark:border-amber-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group">
          <Key className={`h-4 w-4 text-amber-900 dark:text-amber-100 transition-transform duration-300 ${isQuickActionsOpen ? 'rotate-90' : ''}`} />
        </button>
        
        {/* Personalized Title */}
        <h1 className="text-xl lg:text-2xl font-bold text-center text-slate-800 dark:text-slate-100 tracking-wide font-mono uppercase">
          {getFirstName(user.full_name)}'s Dashboard
        </h1>

        {/* Quick Actions Panel - slides out from underneath */}
        <QuickActionsPanel 
          user={user} 
          onModuleSelect={handleModuleSelect} 
          isOpen={isQuickActionsOpen} 
          onClose={() => setIsQuickActionsOpen(false)}
          quickActions={isMember ? {
            addQuickAction,
            removeQuickAction,
            isInQuickActions
          } : undefined}
        />
      </div>


      {/* Dashboard Hero Carousel */}
      <DashboardHeroCarousel />

      {/* Favorites Card for Members */}
      {isMember && groupedModules && !searchQuery && filterCategory === 'all' && (
        <FavoritesCard
          favorites={groupedModules.favorites}
          onModuleClick={handleModuleSelect}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {/* All Modules Card - Single unified view */}
      <AllModulesCard
        modules={allModules}
        onModuleClick={handleModuleSelect}
        navigate={navigate}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />

      {/* AI Assistant & Message Center */}
      <Card className="p-4 bg-background/95 backdrop-blur-sm border-2 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => setAiAssistantOpen(true)}>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          </div>
          <Input 
            placeholder="Ask AI Assistant or check messages..." 
            className="pl-14 cursor-pointer"
            readOnly
          />
        </div>
      </Card>

      {/* Favorites Section */}
      {moduleFavorites.size > 0 && <Collapsible open={!favoritesCollapsed} onOpenChange={open => setFavoritesCollapsed(!open)}>
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

      {/* AI Assistant Dialog */}
      <AIAssistantDialog open={aiAssistantOpen} onOpenChange={setAiAssistantOpen} />
    </div>;
};