import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Book, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { useSharedSpiritualReflections } from "@/hooks/useSharedSpiritualReflections";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export const SpiritualReflectionsCard = () => {
  const { sharedReflections, loading } = useSharedSpiritualReflections();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const getReflectionTypeColor = (type: string) => {
    switch (type) {
      case 'daily_devotional': return 'bg-blue-100 text-blue-800';
      case 'weekly_message': return 'bg-green-100 text-green-800';
      case 'prayer': return 'bg-purple-100 text-purple-800';
      case 'scripture_study': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Spiritual Gleeflections
          </CardTitle>
          <CardDescription>Messages from our Chaplain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sharedReflections.length === 0) {
    return (
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Spiritual Gleeflections
          </CardTitle>
          <CardDescription>Messages from our Chaplain</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No spiritual reflections have been shared yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latestReflection = sharedReflections[0];

  return (
    <Card className="md:col-span-2">
      <Collapsible.Root open={!isMobile || isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <Collapsible.Trigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Spiritual Gleeflections
                </CardTitle>
                <CardDescription>Messages from our Chaplain</CardDescription>
              </div>
              {isMobile && (
                <div className="flex items-center">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              )}
            </div>
          </Collapsible.Trigger>
        </CardHeader>
        <Collapsible.Content>
          <CardContent>
            <div className="space-y-4">
              {/* Latest reflection preview */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{latestReflection.title}</h4>
                  {latestReflection.is_featured && (
                    <Badge variant="outline" className="text-xs">Featured</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={getReflectionTypeColor(latestReflection.reflection_type || 'daily_devotional')} variant="secondary">
                    {(latestReflection.reflection_type || 'daily_devotional').replace('_', ' ')}
                  </Badge>
                  {latestReflection.scripture_reference && (
                    <Badge variant="outline">
                      <Heart className="h-3 w-3 mr-1" />
                      {latestReflection.scripture_reference}
                    </Badge>
                  )}
                </div>
                
                <ScrollArea className="h-20 sm:h-24 mb-2">
                  <p className="text-sm text-muted-foreground pr-4">
                    {latestReflection.content}
                  </p>
                </ScrollArea>
                
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
          </CardContent>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card>
  );
};