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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Book className="h-5 w-5" />
            Spiritual Reflections
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
          </CardTitle>
          <CardDescription>Messages of inspiration and guidance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestReflection = sharedReflections[0];

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Book className="h-5 w-5" />
          Spiritual Reflections
          <Sparkles className="h-4 w-4 text-accent" />
        </CardTitle>
        <CardDescription>Messages of inspiration and guidance</CardDescription>
      </CardHeader>
      <CardContent>
        {!latestReflection ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                A moment of reflection awaits
              </p>
              <p className="text-xs text-muted-foreground">
                Our Chaplain will soon share words of inspiration and spiritual guidance with the Glee Club family.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Latest reflection preview */}
            <div className="border border-primary/10 rounded-lg p-4 bg-background/50 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm text-foreground">{latestReflection.title}</h4>
                {latestReflection.is_featured && (
                  <Badge variant="outline" className="text-xs border-accent text-accent">Featured</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Badge className={getReflectionTypeColor(latestReflection.reflection_type || 'daily_devotional')} variant="secondary">
                  {(latestReflection.reflection_type || 'daily_devotional').replace('_', ' ')}
                </Badge>
                {latestReflection.scripture_reference && (
                  <Badge variant="outline" className="border-primary/20 text-primary">
                    <Heart className="h-3 w-3 mr-1" />
                    {latestReflection.scripture_reference}
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
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
              <div className="text-center">
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