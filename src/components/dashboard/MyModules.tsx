import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LayoutGrid, Settings, Loader2, ChevronDown, Search, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import { useSimplifiedModuleAccess } from '@/hooks/useSimplifiedModuleAccess';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as Icons from 'lucide-react';
type SortOption = 'name-asc' | 'name-desc' | 'default';
interface MyModulesProps {
  userProfile: {
    user_id: string;
    role?: string;
    exec_board_role?: string | null;
    is_exec_board?: boolean;
    is_admin?: boolean;
    is_super_admin?: boolean;
  };
}

// Helper to get icon component from string name or LucideIcon
const getIconComponent = (iconName: string | Icons.LucideIcon) => {
  if (typeof iconName === 'function') {
    return iconName;
  }
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.LayoutGrid;
};
export const MyModules = ({
  userProfile
}: MyModulesProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [isOpen, setIsOpen] = useState(true);
  const {
    getAccessibleModules,
    loading
  } = useSimplifiedModuleAccess(userProfile.user_id);
  const accessibleModules = getAccessibleModules();
  const isSuperAdmin = userProfile.is_super_admin || userProfile.is_admin;
  const getSortLabel = () => {
    switch (sortBy) {
      case 'name-asc':
        return 'A-Z';
      case 'name-desc':
        return 'Z-A';
      default:
        return 'Sort';
    }
  };

  // Color mapping for icon backgrounds
  const getIconColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      emerald: 'from-emerald-400 to-emerald-600',
      pink: 'from-pink-400 to-pink-600',
      purple: 'from-purple-400 to-purple-600',
      green: 'from-green-400 to-green-600',
      teal: 'from-teal-400 to-teal-600',
      blue: 'from-blue-400 to-blue-600',
      red: 'from-red-400 to-red-600',
      orange: 'from-orange-400 to-orange-600',
      yellow: 'from-yellow-400 to-yellow-600',
      indigo: 'from-indigo-400 to-indigo-600',
      cyan: 'from-cyan-400 to-cyan-600',
      rose: 'from-rose-400 to-rose-600',
      amber: 'from-amber-400 to-amber-600',
      gray: 'from-slate-400 to-slate-600',
      slate: 'from-slate-400 to-slate-600',
    };
    return colorMap[color] || 'from-primary/80 to-primary';
  };

  // For super admins, show all modules; for others, show up to 12
  const allModulesWithDetails = accessibleModules.map(module => {
    const unifiedModule = UNIFIED_MODULES.find(u => u.id === module.id);
    return {
      id: module.id,
      title: unifiedModule?.title || module.title || module.id,
      icon: unifiedModule?.icon || 'LayoutGrid',
      iconColor: unifiedModule?.iconColor || 'blue',
      route: `/dashboard?module=${module.id}`
    };
  }).slice(0, isSuperAdmin ? 100 : 12);

  // Filter by search
  const filteredModules = allModulesWithDetails.filter(module => module.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Sort modules
  const modulesWithDetails = [...filteredModules].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.title.localeCompare(b.title);
      case 'name-desc':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  // Admin always gets admin settings
  const showAdminSettings = userProfile.is_admin || userProfile.is_super_admin;
  if (loading) {
    return <Card className="border border-border bg-card">
        <CardHeader className="pb-2 px-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">My Modules</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>;
  }
  if (modulesWithDetails.length === 0 && !showAdminSettings) {
    return null; // Don't render if no assigned modules
  }
  return <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-primary/30 bg-card shadow-sm py-0">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 px-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold text-foreground">My Modules</CardTitle>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 py-4 space-y-4 bg-card pt-0">
            {/* Search and Sort Controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search modules..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-background border border-border text-foreground placeholder:text-muted-foreground shadow-sm" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-background border-border h-10 text-foreground">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">{getSortLabel()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('name-asc')} className="gap-2">
                    <SortAsc className="h-4 w-4" />
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name-desc')} className="gap-2">
                    <SortDesc className="h-4 w-4" />
                    Name (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('default')} className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Default Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid w-full grid-cols-3 gap-y-6 gap-x-2 justify-items-center py-2">
              {modulesWithDetails.map(module => {
              const IconComponent = getIconComponent(module.icon);
              const colorClasses = getIconColorClasses(module.iconColor);
              return <button 
                  key={module.id} 
                  onClick={() => navigate(module.route)} 
                  className="flex flex-col items-center gap-1.5 group w-20 sm:w-24"
                >
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[22%] bg-gradient-to-br ${colorClasses} shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:shadow-xl transition-all duration-200`}>
                      <IconComponent className="h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow-sm" />
                    </div>
                    <span className="text-[11px] sm:text-xs text-center leading-tight line-clamp-2 text-foreground/80 group-hover:text-foreground transition-colors font-medium">
                      {module.title}
                    </span>
                  </button>;
            })}
              {showAdminSettings && <button 
                  className="flex flex-col items-center gap-1.5 group w-20 sm:w-24" 
                  onClick={() => navigate('/dashboard?module=admin-settings')}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22%] bg-gradient-to-br from-slate-400 to-slate-600 shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:shadow-xl transition-all duration-200">
                    <Settings className="h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow-sm" />
                  </div>
                  <span className="text-[11px] sm:text-xs text-center leading-tight font-medium text-foreground/80 group-hover:text-foreground transition-colors">Admin Settings</span>
                </button>}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>;
};