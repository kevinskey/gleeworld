import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FavoritesCardProps {
  favorites: any[];
  onModuleClick: (moduleId: string) => void;
  onToggleFavorite: (moduleId: string) => void;
}

export const FavoritesCard = ({ favorites, onModuleClick, onToggleFavorite }: FavoritesCardProps) => {
  const navigate = useNavigate();

  if (favorites.length === 0) {
    return (
      <Card className="bg-background/95 backdrop-blur-sm mt-0">
        <CardHeader className="pt-4 pb-3">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Favorites
          </CardTitle>
          <CardDescription>Your favorite modules will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click the heart icon on any module to add it to your favorites.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500 fill-current" />
          Favorites
        </CardTitle>
        <CardDescription>Quick access to your favorite modules</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {favorites.map((module) => {
            const IconComponent = module.icon;
            return (
              <div
                key={module.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {IconComponent && (
                    <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                      <IconComponent className={`h-4 w-4 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{module.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{module.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(module.id);
                    }}
                    className="p-2 h-auto text-red-500 hover:text-red-600"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (module.id === 'librarian') {
                        navigate('/librarian-dashboard');
                      } else {
                        onModuleClick(module.id);
                      }
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
