import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grid3x3, Heart, ArrowUpDown, SortAsc, SortDesc, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortOption = 'name-asc' | 'name-desc' | 'recent' | 'favorites';

interface MyModulesCardProps {
  modules: any[];
  onModuleClick: (moduleId: string) => void;
  onToggleFavorite: (moduleId: string) => void;
  isFavorite: (moduleId: string) => boolean;
}

export const MyModulesCard = ({ modules, onModuleClick, onToggleFavorite, isFavorite }: MyModulesCardProps) => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  const sortModules = (modulesToSort: any[]) => {
    const sorted = [...modulesToSort];
    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'name-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'favorites':
        return sorted.sort((a, b) => {
          const aFav = isFavorite(a.id) ? 1 : 0;
          const bFav = isFavorite(b.id) ? 1 : 0;
          return bFav - aFav || a.title.localeCompare(b.title);
        });
      case 'recent':
      default:
        return sorted;
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name-asc': return 'A-Z';
      case 'name-desc': return 'Z-A';
      case 'favorites': return 'Favorites';
      case 'recent': return 'Recent';
      default: return 'Sort';
    }
  };

  if (modules.length === 0) {
    return (
      <Card className="bg-background/95 backdrop-blur-sm">
        <CardHeader className="pt-4 pb-3">
          <CardTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            My Modules
          </CardTitle>
          <CardDescription>Your assigned modules will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No modules assigned yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedModules = sortModules(modules);

  return (
    <Card className="bg-background/95 backdrop-blur-sm">
      <CardHeader className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5" />
              My Modules
            </CardTitle>
            <CardDescription>All your assigned modules</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="text-xs">{getSortLabel()}</span>
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
              <DropdownMenuItem onClick={() => setSortBy('favorites')} className="gap-2">
                <Heart className="h-4 w-4" />
                Favorites First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('recent')} className="gap-2">
                <Clock className="h-4 w-4" />
                Default Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedModules.map((module) => {
            const IconComponent = module.icon;
            const isModuleFavorited = isFavorite(module.id);
            return (
              <div key={module.id} className="relative group">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4 hover:bg-accent/50 w-full"
                  onClick={() => {
                    if (module.id === 'librarian') {
                      navigate('/librarian-dashboard');
                    } else {
                      onModuleClick(module.id);
                    }
                  }}
                >
                  {IconComponent && (
                    <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                      <IconComponent className={`h-5 w-5 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                    </div>
                  )}
                  <span className="text-xs font-medium text-center line-clamp-2">
                    {module.title}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(module.id);
                  }}
                  className={`absolute top-1 right-1 p-1 h-auto ${isModuleFavorited ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500 transition-colors`}
                >
                  <Heart className={`h-3 w-3 ${isModuleFavorited ? 'fill-current' : ''}`} />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
