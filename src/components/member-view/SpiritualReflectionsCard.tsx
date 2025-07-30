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
      <Card className="col-span-1 md:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Book className="h-4 w-4 sm:h-5 sm:w-5" />
            Spiritual Gleeflections
          </CardTitle>
          <CardDescription className="text-sm">Messages from our Chaplain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4 sm:p-6">
            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sharedReflections.length === 0) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Book className="h-4 w-4 sm:h-5 sm:w-5" />
            Spiritual Gleeflections
          </CardTitle>
          <CardDescription className="text-sm">Messages from our Chaplain</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4 sm:py-6">
            No spiritual reflections have been shared yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latestReflection = sharedReflections[0];

  return (
    <Card className="col-span-1 md:col-span-2">
      <Collapsible.Root open={!isMobile || isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3 sm:pb-4">
          <Collapsible.Trigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Book className="h-4 w-4 sm:h-5 sm:w-5" />
                  Spiritual Gleeflections
                </CardTitle>
                <CardDescription className="text-sm">Messages from our Chaplain</CardDescription>
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
          <CardContent className="pt-0">
            <div className="space-y-3 sm:space-y-4">
              {/* Latest reflection preview */}
              <div className="border rounded-lg p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <h4 className="font-medium text-sm sm:text-base leading-tight pr-2">{latestReflection.title}</h4>
                  {latestReflection.is_featured && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">Featured</Badge>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                  <Badge className={getReflectionTypeColor(latestReflection.reflection_type || 'daily_devotional')} variant="secondary">
                    {(latestReflection.reflection_type || 'daily_devotional').replace('_', ' ')}
                  </Badge>
                  {latestReflection.scripture_reference && (
                    <Badge variant="outline" className="w-fit">
                      <Heart className="h-3 w-3 mr-1" />
                      {latestReflection.scripture_reference}
                    </Badge>
                  )}
                </div>
                
                <ScrollArea className="h-16 sm:h-20 md:h-24 mb-2 sm:mb-3">
                  <p className="text-xs sm:text-sm text-muted-foreground pr-4 leading-relaxed">
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
                  <p className="text-xs sm:text-sm text-muted-foreground">
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