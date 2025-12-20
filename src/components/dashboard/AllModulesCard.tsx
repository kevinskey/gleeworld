import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronUp, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);

  const filteredModules = modules.filter(module => 
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    module.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden bg-primary border border-primary-foreground/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="py-3 px-3 sm:px-4 hover:bg-primary-foreground/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between min-h-[48px] pl-[20px] px-[10px]">
              <div className="gap-3 flex items-start justify-start">
                <Grid3x3 className="text-primary-foreground flex-shrink-0 w-5 h-5 mt-0.5" />
                <div className="text-left">
                  <CardTitle className="text-lg leading-tight text-primary-foreground">My Modules</CardTitle>
                  <CardDescription className="leading-tight text-primary-foreground/70">All modules assigned to you</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="secondary" className="text-sm bg-primary-foreground/20 text-primary-foreground">
                  {modules.length}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-primary-foreground/70" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-primary-foreground/70" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 px-3 sm:px-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-foreground/60" />
              <Input 
                placeholder="Search modules..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50" 
              />
            </div>

            {filteredModules.length === 0 ? (
              <div className="text-center py-8 text-primary-foreground/70">
                <p>No modules found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredModules.map(module => {
                  const IconComponent = module.icon;
                  const isFav = isFavorite(module.id);
                  return (
                    <Card 
                      key={module.id} 
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-primary/80 border border-primary-foreground/30 relative group hover:bg-primary/70" 
                      onClick={() => {
                        if (module.id === 'librarian') {
                          navigate('/librarian-dashboard');
                        } else {
                          onModuleClick(module.id);
                        }
                      }}
                    >
                      <CardHeader className="pb-3 pt-4">
                        <div className="flex flex-col items-center text-center gap-2">
                          {IconComponent && (
                            <div className="p-2 rounded-lg bg-primary-foreground/10">
                              <IconComponent className="h-5 w-5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 w-full">
                            <CardTitle className="text-sm font-medium leading-tight line-clamp-2 text-primary-foreground">
                              {module.title}
                            </CardTitle>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={e => {
                              e.stopPropagation();
                              onToggleFavorite(module.id);
                            }} 
                            className={`p-1 h-auto absolute top-2 right-2 ${isFav ? "text-red-400" : "text-primary-foreground/60"} hover:text-red-400 transition-colors`}
                          >
                            <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
