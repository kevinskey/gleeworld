import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, Heart, Sparkles } from "lucide-react";
import { useSharedSpiritualReflections } from "@/hooks/useSharedSpiritualReflections";

export const SpiritualReflectionsSection = () => {
  console.log('SpiritualReflectionsSection: Component called/mounted');
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
      <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-primary text-lg">
            <Book className="h-4 w-4" />
            Spiritual Reflections
            <Sparkles className="h-3 w-3 text-accent animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-center p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestReflection = sharedReflections[0];

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary text-lg">
          <Book className="h-4 w-4" />
          Spiritual Reflections
          <Sparkles className="h-3 w-3 text-accent" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!latestReflection ? (
          <div className="text-center py-3 space-y-2">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-foreground">
                A moment of reflection awaits
              </p>
              <p className="text-sm text-muted-foreground">
                Our Chaplain will soon share words of inspiration.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Latest reflection preview */}
            <div className="border border-primary/10 rounded-lg p-3 bg-background/50 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-medium text-base text-foreground line-clamp-1">{latestReflection.title}</h4>
                {latestReflection.is_featured && (
                  <Badge variant="outline" className="text-xs border-accent text-accent ml-2">Featured</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getReflectionTypeColor(latestReflection.reflection_type || 'daily_devotional')} variant="secondary">
                  {(latestReflection.reflection_type || 'daily_devotional').replace('_', ' ')}
                </Badge>
                {latestReflection.scripture_reference && (
                  <Badge variant="outline" className="border-primary/20 text-primary text-xs">
                    <Heart className="h-3 w-3 mr-1" />
                    {latestReflection.scripture_reference}
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                {latestReflection.content}
              </p>
              
              <div className="text-xs text-muted-foreground">
                {latestReflection.shared_at 
                  ? `Shared on ${new Date(latestReflection.shared_at).toLocaleDateString()}`
                  : 'Recently shared'
                }
              </div>
            </div>

            {/* Additional reflections count */}
            {sharedReflections.length > 1 && (
              <div className="text-center pt-1">
                <p className="text-sm text-muted-foreground">
                  +{sharedReflections.length - 1} more spiritual reflection{sharedReflections.length > 2 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};