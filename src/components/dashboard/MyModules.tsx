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

const getIconComponent = (iconName: string | Icons.LucideIcon) => {
  if (typeof iconName === 'function') return iconName;
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.LayoutGrid;
};

const getGlassGradient = (color: string) => {
  const m: Record<string, string> = {
    emerald: 'from-emerald-500/30 to-green-600/30',
    pink: 'from-pink-500/30 to-rose-600/30',
    purple: 'from-purple-500/30 to-violet-600/30',
    green: 'from-green-500/30 to-emerald-600/30',
    teal: 'from-teal-500/30 to-cyan-600/30',
    blue: 'from-blue-500/30 to-indigo-600/30',
    red: 'from-red-500/30 to-rose-600/30',
    orange: 'from-orange-500/30 to-amber-600/30',
    yellow: 'from-yellow-500/30 to-amber-600/30',
    indigo: 'from-indigo-500/30 to-violet-600/30',
    cyan: 'from-cyan-500/30 to-blue-600/30',
    rose: 'from-rose-500/30 to-pink-600/30',
    amber: 'from-amber-500/30 to-orange-600/30',
    gray: 'from-slate-500/30 to-gray-600/30',
    slate: 'from-slate-500/30 to-gray-600/30',
  };
  return m[color] || 'from-white/10 to-white/5';
};

const getAccentColor = (color: string) => {
  const m: Record<string, string> = {
    emerald: 'text-emerald-300', pink: 'text-pink-300', purple: 'text-violet-300',
    green: 'text-green-300', teal: 'text-teal-300', blue: 'text-blue-300',
    red: 'text-rose-300', orange: 'text-orange-300', yellow: 'text-yellow-300',
    indigo: 'text-indigo-300', cyan: 'text-cyan-300', rose: 'text-rose-300',
    amber: 'text-amber-300', gray: 'text-slate-300', slate: 'text-slate-300',
  };
  return m[color] || 'text-white';
};

export const MyModules = ({ userProfile }: MyModulesProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [isOpen, setIsOpen] = useState(false);
  const { getAccessibleModules, loading } = useSimplifiedModuleAccess(userProfile.user_id);
  const accessibleModules = getAccessibleModules();
  const isSuperAdmin = userProfile.is_super_admin || userProfile.is_admin;

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name-asc': return 'A-Z';
      case 'name-desc': return 'Z-A';
      default: return 'Sort';
    }
  };

  const allModulesWithDetails = accessibleModules.map((module) => {
    const unifiedModule = UNIFIED_MODULES.find((u) => u.id === module.id);
    return {
      id: module.id,
      title: unifiedModule?.title || module.title || module.id,
      icon: unifiedModule?.icon || 'LayoutGrid',
      iconColor: unifiedModule?.iconColor || 'blue',
      route: `/dashboard?module=${module.id}`
    };
  }).slice(0, isSuperAdmin ? 100 : 12);

  const filteredModules = allModulesWithDetails.filter((module) =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modulesWithDetails = [...filteredModules].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc': return a.title.localeCompare(b.title);
      case 'name-desc': return b.title.localeCompare(a.title);
      default: return 0;
    }
  });

  const showAdminSettings = userProfile.is_admin || userProfile.is_super_admin;

  if (loading) {
    return (
      <Card className="border border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="pb-2 px-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold text-white/90">My Modules</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (modulesWithDetails.length === 0 && !showAdminSettings) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-white/10 bg-gradient-to-b from-[hsl(208,100%,20%)] via-[hsl(208,100%,17%)] to-[hsl(208,100%,14%)] shadow-sm py-0 rounded-none">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-4 px-4 cursor-pointer hover:bg-white/5 transition-colors rounded-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm sm:text-xl font-semibold text-white/90" style={{ fontFamily: "'Cinzel', serif" }}>My Modules</CardTitle>
              </div>
              <ChevronDown className={`h-5 w-5 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 py-4 space-y-4 pt-0">
            {/* Search and Sort */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/10 border border-white/10 text-white placeholder:text-white/40 shadow-sm backdrop-blur-sm"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-white/10 border-white/10 h-10 text-white/70 hover:text-white hover:bg-white/20">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">{getSortLabel()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('name-asc')} className="gap-2">
                    <SortAsc className="h-4 w-4" /> Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name-desc')} className="gap-2">
                    <SortDesc className="h-4 w-4" /> Name (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('default')} className="gap-2">
                    <LayoutGrid className="h-4 w-4" /> Default Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Glassmorphic Grid */}
            <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
              {modulesWithDetails.map((module) => {
                const IconComponent = getIconComponent(module.icon);
                const gradient = getGlassGradient(module.iconColor);
                const accent = getAccentColor(module.iconColor);
                return (
                  <button
                    key={module.id}
                    onClick={() => navigate(module.route)}
                    className={`group relative flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl bg-gradient-to-br ${gradient} border border-white/10 backdrop-blur-md hover:scale-[1.03] hover:border-white/25 hover:shadow-lg hover:shadow-white/5 transition-all duration-300 text-center`}
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center bg-white/10 group-hover:bg-white/20 transition-colors border border-white/10">
                      <IconComponent className={`h-6 w-6 sm:h-7 sm:w-7 ${accent}`} />
                    </div>
                    <span className={`font-['Cinzel'] text-xs sm:text-sm font-bold tracking-wide leading-tight line-clamp-2 ${accent}`}>
                      {module.title}
                    </span>
                  </button>
                );
              })}
              {showAdminSettings && (
                <button
                  onClick={() => navigate('/dashboard?module=admin-settings')}
                  className="group relative flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl bg-gradient-to-br from-slate-500/30 to-gray-600/30 border border-white/10 backdrop-blur-md hover:scale-[1.03] hover:border-white/25 hover:shadow-lg hover:shadow-white/5 transition-all duration-300 text-center"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center bg-white/10 group-hover:bg-white/20 transition-colors border border-white/10">
                    <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-slate-300" />
                  </div>
                  <span className="font-['Cinzel'] text-xs sm:text-sm font-bold tracking-wide text-slate-300">
                    Admin Settings
                  </span>
                </button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
