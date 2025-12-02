import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Book, Heart, Sparkles, ChevronDown, ChevronUp, Trees } from "lucide-react";
import { useSharedSpiritualReflections } from "@/hooks/useSharedSpiritualReflections";

export const SpiritualReflectionsSection = () => {
  console.log('SpiritualReflectionsSection: Component called/mounted');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { sharedReflections, loading } = useSharedSpiritualReflections();
  
  console.log('SpiritualReflectionsSection: loading=', loading, 'reflections=', sharedReflections);

  const getReflectionTypeColor = (type: string) => {
    switch (type) {
      case 'daily_devotional': return 'bg-primary/10 text-primary border-primary/20';
      case 'weekly_message': return 'bg-secondary/10 text-foreground border-secondary/20';
      case 'prayer': return 'bg-accent/10 text-foreground border-accent/20';
      case 'scripture_study': return 'bg-muted text-muted-foreground border-muted-foreground/20';
      default: return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 h-full">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Trees className="h-4 w-4" />
            Spiritual Gleeflections
            <Sparkles className="h-3 w-3 text-accent animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex-1 overflow-hidden">
          <div className="flex justify-center p-1">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestReflection = sharedReflections[0];

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-lg">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <CardTitle className="flex items-center justify-between text-foreground text-lg sm:text-xl">
          <div className="flex items-center gap-2">
            <Trees className="h-5 w-5" />
            Spiritual Gleeflections
            <Sparkles className="h-3 w-3 text-accent" />
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="pt-0 space-y-3 max-h-96 overflow-y-auto">
          {!sharedReflections.length ? (
            <div className="text-center py-2 space-y-1">
              <div className="w-8 h-8 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">
                  A moment of reflection awaits
                </p>
                <p className="text-sm md:text-base text-muted-foreground">
                  Our Chaplain will soon share words of inspiration.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show all reflections */}
              {sharedReflections.map((reflection, index) => (
                <div key={reflection.id} className="border border-primary/10 rounded-lg p-3 bg-background/50 backdrop-blur-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-base text-foreground">{reflection.title}</h4>
                    <div className="flex items-center gap-1">
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs border-primary text-primary">Latest</Badge>
                      )}
                      {reflection.is_featured && (
                        <Badge variant="outline" className="text-xs border-accent text-accent">Featured</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-2">
                    <Badge className={`${getReflectionTypeColor(reflection.reflection_type || 'daily_devotional')} text-xs`} variant="secondary">
                      {(reflection.reflection_type || 'daily_devotional').replace('_', ' ')}
                    </Badge>
                    {reflection.scripture_reference && (
                      <Badge variant="outline" className="border-primary/20 text-primary text-xs">
                        <Heart className="h-2 w-2 mr-1" />
                        {reflection.scripture_reference}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {reflection.content}
                  </p>
                  
                  <div className="text-xs text-muted-foreground">
                    {reflection.shared_at 
                      ? `Shared on ${new Date(reflection.shared_at).toLocaleDateString()}`
                      : 'Recently shared'
                    }
                  </div>
                </div>
              ))}
              
              {/* Summary at bottom */}
              <div className="text-center pt-2 border-t border-primary/10">
                <p className="text-xs text-muted-foreground">
                  Showing {sharedReflections.length} spiritual reflection{sharedReflections.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};