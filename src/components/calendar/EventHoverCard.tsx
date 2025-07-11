import { format } from "date-fns";
import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";

interface EventHoverCardProps {
  event: GleeWorldEvent;
  children: React.ReactNode;
  canEdit?: boolean;
}

export const EventHoverCard = ({ event, children, canEdit }: EventHoverCardProps) => {
  const getEventTypeColor = (type: string | null) => {
    switch (type) {
      case 'performance':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'rehearsal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'meeting':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'social':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'workshop':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'audition':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div className="hidden md:block">
          {children}
        </div>
      </HoverCardTrigger>
      
      {/* Show children without hover card on mobile */}
      <div className="md:hidden">
        {children}
      </div>
      
      <HoverCardContent 
        className="w-80 p-4 bg-background border shadow-lg animate-fade-in"
        side="top"
        align="center"
        sideOffset={8}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground line-clamp-2 mb-1">
                {event.title}
              </h4>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getEventTypeColor(event.event_type)}`}
                >
                  {event.event_type || 'Other'}
                </Badge>
                {canEdit && (
                  <Badge variant="outline" className="text-xs">
                    Editable
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="font-medium">
                {format(new Date(event.start_date), 'EEEE, MMM d, yyyy')}
              </div>
              <div className="text-muted-foreground text-xs">
                {format(new Date(event.start_date), 'h:mm a')}
                {event.end_date && (
                  <> - {format(new Date(event.end_date), 'h:mm a')}</>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          {(event.location || event.venue_name) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPinIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {event.venue_name && (
                  <div className="font-medium truncate">
                    {event.venue_name}
                  </div>
                )}
                {event.location && (
                  <div className="text-muted-foreground text-xs truncate">
                    {event.location}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="text-sm text-muted-foreground">
              <p className="line-clamp-3">{event.description}</p>
            </div>
          )}

          {/* Additional Details */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            {event.max_attendees && (
              <div className="flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                <span>Max {event.max_attendees}</span>
              </div>
            )}
            {event.registration_required && (
              <div className="text-orange-600 dark:text-orange-400">
                Registration Required
              </div>
            )}
            <div className="text-xs text-muted-foreground ml-auto">
              {canEdit ? 'Click to edit' : 'Click for details'}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};