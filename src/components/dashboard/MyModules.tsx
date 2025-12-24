import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LayoutGrid, Settings, Loader2, ChevronDown, Search, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import { useSimplifiedModuleAccess } from '@/hooks/useSimplifiedModuleAccess';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      case 'name-asc': return 'A-Z';
      case 'name-desc': return 'Z-A';
      default: return 'Sort';
    }
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
  const filteredModules = allModulesWithDetails.filter(module =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <Card className="border border-border bg-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between py-5">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold tracking-wide">MY MODULES</CardTitle>
                <span className="text-xs text-muted-foreground">
                  ({modulesWithDetails.length + (showAdminSettings ? 1 : 0)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {userProfile.exec_board_role && (
                  <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                    {userProfile.exec_board_role}
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 py-4 space-y-4 bg-card">
            {/* Search and Sort Controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                <Input
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/80"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-background border-border h-10">
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
            <div className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {modulesWithDetails.map(module => {
                const IconComponent = getIconComponent(module.icon);
                return (
                  <Button
                    key={module.id}
                    variant="outline"
                    onClick={() => navigate(module.route)}
                    className="module-card-solid h-[130px] md:h-[150px] lg:h-[160px] py-4 px-3 flex flex-col items-center justify-center gap-3 border-primary/30 hover:opacity-95 hover:border-primary/40"
                  >
                    <div className="flex-shrink-0">
                      <IconComponent className="h-9 w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 text-primary-foreground" />
                    </div>
                    <span className="text-sm md:text-base lg:text-lg text-center leading-tight line-clamp-2 text-primary-foreground px-1 font-medium break-words w-full">
                      {module.title}
                    </span>
                  </Button>
                );
              })}
              {showAdminSettings && (
                <Button
                  variant="outline"
                  className="module-card-solid h-[130px] md:h-[150px] lg:h-[160px] py-4 px-3 flex flex-col items-center justify-center gap-3 border-primary/30 hover:opacity-95 hover:border-primary/40"
                  onClick={() => navigate('/dashboard?module=admin-settings')}
                >
                  <div className="flex-shrink-0">
                    <Settings className="h-9 w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 text-primary-foreground" />
                  </div>
                  <span className="text-sm md:text-base lg:text-lg text-center leading-tight font-medium text-primary-foreground">Admin Settings</span>
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>;
};