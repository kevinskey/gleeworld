import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  if (favorites.length === 0) {
    return <Card className="bg-background/95 backdrop-blur-sm mt-0">
        <CardHeader className="py-3 px-3 sm:px-4">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Favorites
            <span className="text-[10px] md:text-xs font-normal text-foreground/70 ml-2 uppercase">scroll to choose your fav!</span>
          </CardTitle>
          <CardDescription>Your favorite modules will appear here</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-4">
          <p className="text-sm text-muted-foreground">
            Touch a heart to add a fave module.
          </p>
        </CardContent>
      </Card>;
  }
  return <Card className="bg-background/95 backdrop-blur-sm">
      <CardHeader className="py-3 px-3 sm:px-4">
        <CardTitle className="flex items-center gap-2 px-[20px] text-primary-foreground">
          <Heart className="h-5 w-5 text-red-500 fill-current" />
          Favorites
          <span className="text-[10px] md:text-xs font-normal text-foreground/70 ml-2 uppercase">scroll to choose your fav!</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-0">
        <ScrollArea className="h-44">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pr-4">
            {favorites.map(module => {
            const IconComponent = module.icon;
            return <div key={module.id} className="relative flex items-center justify-between p-3 pr-10 rounded-lg border bg-card text-card-foreground hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => {
              if (module.id === 'librarian') {
                navigate('/librarian-dashboard');
              } else {
                onModuleClick(module.id);
              }
            }}>
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {IconComponent && <div className={`p-1.5 sm:p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                      <IconComponent className={`h-4 w-4 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                    </div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate text-card-foreground">{module.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{module.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={e => {
                e.stopPropagation();
                onToggleFavorite(module.id);
              }} className="absolute top-2 right-2 p-1.5 sm:p-2 h-auto rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all" title="Remove from favorites">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                </Button>
              </div>;
          })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>;
};