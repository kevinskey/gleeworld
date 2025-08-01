import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ClockIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";

interface PublicUpcomingEventsProps {
  limit?: number;
  showHeader?: boolean;
}

export const PublicUpcomingEvents = ({ limit = 6, showHeader = true }: PublicUpcomingEventsProps) => {
  const { events, loading } = usePublicGleeWorldEvents();
  
  const upcomingEvents = events.slice(0, limit);

  const scrollLeft = () => {
    const container = document.getElementById('events-container');
    if (container) {
      const cardWidth = window.innerWidth < 768 ? 280 : 320; // Card width + gap
      container.scrollBy({ 
        left: -cardWidth, 
        behavior: 'smooth' 
      });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('events-container');
    if (container) {
      const cardWidth = window.innerWidth < 768 ? 280 : 320; // Card width + gap  
      container.scrollBy({ 
        left: cardWidth, 
        behavior: 'smooth' 
      });
    }
  };

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Upcoming Public Events
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Upcoming Events
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't miss these exciting upcoming Glee Club performances and events
          </p>
        </div>
      )}
      
      {/* Horizontal Events Slider */}
      <div className="relative group">
        {/* Navigation Arrows */}
        {upcomingEvents.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm border-white/20 shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-300 hover:bg-white"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"  
              size="icon"
              onClick={scrollRight}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm border-white/20 shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-300 hover:bg-white"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Events Container */}
        <div 
          id="events-container"
          className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent snap-x snap-mandatory scroll-smooth touch-pan-x"
          style={{ 
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x'
          }}
        >
          {upcomingEvents.length === 0 ? (
            <div className="w-full text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming public events</p>
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <Card 
                key={event.id} 
                className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 flex-shrink-0 w-72 md:w-80 snap-start hover-scale cursor-pointer"
              >
                <div className="relative">
                  {/* Event Type Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <Badge variant="secondary" className="bg-white/90 text-primary">
                      {event.event_type || 'Event'}
                    </Badge>
                  </div>
                  
                  {/* Event Header with gradient background */}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 border-b">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full mb-4">
                        <CalendarIcon className="h-8 w-8" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <ClockIcon className="h-5 w-5 text-primary flex-shrink-0" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(event.start_date), 'PPP')}
                        </div>
                        <div className="text-muted-foreground">
                          {format(new Date(event.start_date), 'p')}
                          {event.end_date && (
                            <span> - {format(new Date(event.end_date), 'p')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {(event.location || event.venue_name) && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <MapPinIcon className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="font-medium">
                          {event.venue_name || event.location}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {event.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-3">
                    <Button className="w-full group/btn hover-scale" size="sm">
                      View Details
                      <CalendarIcon className="h-4 w-4 ml-2 group-hover/btn:scale-110 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};