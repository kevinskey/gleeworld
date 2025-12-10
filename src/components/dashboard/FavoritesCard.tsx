import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Heart, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FavoritesCardProps {
  favorites: any[];
  onModuleClick: (moduleId: string) => void;
  onToggleFavorite: (moduleId: string) => void;
}

export const FavoritesCard = ({
  favorites,
  onModuleClick,
  onToggleFavorite
}: FavoritesCardProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  if (favorites.length === 0) {
    return (
      <Card className="bg-background/95 backdrop-blur-sm mt-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-3 sm:px-0 cursor-pointer hover:bg-primary/5 transition-colors">
              <CardTitle className="flex items-center gap-2 !text-white pl-[10px]">
              <Heart className="h-5 w-5 !text-red-500" />
              My Fav Apps
                <span className="text-[10px] md:text-xs font-normal !text-white/70 ml-2 uppercase">
                  scroll to choose your fav!
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 ml-auto mr-2 transition-transform duration-200 !text-white/70",
                  isOpen && "rotate-180"
                )} />
              </CardTitle>
              <CardDescription className="!text-white/80 pl-[10px]">
                Your favorite modules will appear here
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-3 pb-3 pt-0 sm:px-[20px]">
              <p className="text-sm text-muted-foreground">
                Touch a heart to add a fave module.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card className="bg-background/95 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-3 sm:px-0 cursor-pointer hover:bg-primary/5 transition-colors">
            <CardTitle className="flex items-center gap-2 !text-white pl-[10px]">
              <Heart className="h-5 w-5 !text-red-500 fill-current" />
              My Fav Apps
              <span className="text-[10px] md:text-xs font-normal !text-white/70 ml-2 uppercase">
                scroll to choose your fav!
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 ml-auto mr-2 transition-transform duration-200 !text-white/70",
                isOpen && "rotate-180"
              )} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-3 pb-3 pt-0 sm:px-[20px]">
            {/* Horizontal scrolling container like GleeCamCard */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {favorites.map(module => {
                const IconComponent = module.icon;
                
                return (
                  <div 
                    key={module.id} 
                    className="group cursor-pointer flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[calc(25%-9px)] relative"
                  >
                    <div 
                      onClick={() => {
                        if (module.id === 'librarian') {
                          navigate('/librarian-dashboard');
                        } else {
                          onModuleClick(module.id);
                        }
                      }}
                      className={cn(
                        "p-2 flex flex-col items-center text-center transition-all duration-300",
                        "bg-card border border-border hover:border-primary/50",
                        "shadow-lg hover:shadow-xl min-h-[140px] justify-center"
                      )}
                    >
                      {/* Icon */}
                      <div className="w-12 h-12 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 bg-primary/20">
                        {IconComponent && <IconComponent className="h-7 w-7 text-primary" />}
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-0.5 tracking-wide uppercase leading-tight line-clamp-1">
                        {module.title}
                      </h4>

                      {/* Description */}
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight line-clamp-2">
                        {module.description}
                      </p>
                    </div>

                    {/* Favorite button - positioned at top right */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={e => {
                        e.stopPropagation();
                        onToggleFavorite(module.id);
                      }} 
                      className="absolute top-1 right-1 p-1 h-auto text-red-500 hover:text-red-700 hover:bg-red-50/20 transition-all z-10"
                      title="Remove from favorites"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
