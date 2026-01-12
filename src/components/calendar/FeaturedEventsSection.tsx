import { format } from "date-fns";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { getDefaultEventImage } from "@/constants/images";
import { useState } from "react";
import { EventDetailDialog } from "./EventDetailDialog";

interface FeaturedEventsSectionProps {
  events: GleeWorldEvent[];
}

export const FeaturedEventsSection = ({ events }: FeaturedEventsSectionProps) => {
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);

  // Get upcoming events (next 4 events from today)
  const upcomingEvents = events
    .filter(event => new Date(event.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 4);

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-8">
        <h3 className="text-xl font-bold text-[#003666] mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Upcoming Events
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingEvents.map((event) => {
            const eventImage = event.image_url || getDefaultEventImage(event.id);
            const eventDate = new Date(event.start_date);
            
            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="group cursor-pointer bg-white rounded-xl overflow-hidden border border-neutral-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Event Image */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={eventImage}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = getDefaultEventImage(event.id);
                    }}
                  />
                  {/* Date Badge */}
                  <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-md">
                    <div className="text-xs font-bold text-[#003666] uppercase">
                      {format(eventDate, 'MMM')}
                    </div>
                    <div className="text-lg font-bold text-[#003666] leading-tight">
                      {format(eventDate, 'd')}
                    </div>
                  </div>
                </div>
                
                {/* Event Info */}
                <div className="p-3">
                  <h4 className="font-semibold text-[#003666] text-sm line-clamp-2 mb-2 group-hover:text-[#002244]">
                    {event.title}
                  </h4>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>{format(eventDate, 'h:mm a')}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </>
  );
};
