import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronUp, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heart, GripVertical } from "lucide-react";
interface AllModulesCardProps {
  modules: any[];
  onModuleClick: (moduleId: string) => void;
  navigate: (path: string) => void;
  isFavorite: (moduleId: string) => boolean;
  onToggleFavorite: (moduleId: string) => void;
}
export const AllModulesCard = ({
  modules,
  onModuleClick,
  navigate,
  isFavorite,
  onToggleFavorite
}: AllModulesCardProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default

  // Filter modules based on search
  const filteredModules = modules.filter(module => module.title.toLowerCase().includes(searchQuery.toLowerCase()) || module.description.toLowerCase().includes(searchQuery.toLowerCase()));
  return <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden bg-background/95 backdrop-blur-sm border-2">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="py-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between min-h-[48px]">
              <div className="gap-3 flex items-start justify-start">
                <Grid3x3 className="text-primary flex-shrink-0 pt-[10px] w-[20px] h-[20px]" />
                <div className="text-left">
                  <CardTitle className="text-lg leading-tight pt-[10px] pb-[10px] py-[5px]">My Modules</CardTitle>
                  <CardDescription className="leading-tight">All modules assigned to you</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="secondary" className="text-sm">
                  {modules.length}
                </Badge>
                {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Search Field */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search modules..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {/* Modules Grid */}
            {filteredModules.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                <p>No modules found</p>
              </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModules.map(module => {
              const IconComponent = module.icon;
              const isFav = isFavorite(module.id);
              return <Card key={module.id} className="cursor-pointer hover:shadow-md transition-all duration-200 bg-background/95 backdrop-blur-sm border-2 relative" onClick={() => {
                if (module.id === 'librarian') {
                  navigate('/librarian-dashboard');
                } else {
                  onModuleClick(module.id);
                }
              }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
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
                          <Button variant="ghost" size="sm" onClick={e => {
                      e.stopPropagation();
                      onToggleFavorite(module.id);
                    }} className={`p-1 h-auto ${isFav ? "text-red-500" : "text-muted-foreground"} hover:text-red-500 transition-colors`}>
                            <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>;
            })}
              </div>}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>;
};