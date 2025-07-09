import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPinIcon, ClockIcon, UsersIcon, ExternalLinkIcon, FileText, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";

interface EventDetailDialogProps {
  event: GleeWorldEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventDetailDialog = ({ event, open, onOpenChange }: EventDetailDialogProps) => {
  if (!event) return null;

  const getEventTypeColor = (type: string | null) => {
    switch (type) {
      case 'performance':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'rehearsal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'meeting':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleAddToCalendar = () => {
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const formatCalendarDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`;
    
    window.open(calendarUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
            <Badge className={getEventTypeColor(event.event_type)}>
              {event.event_type || 'Event'}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {event.description && (
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {format(new Date(event.start_date), 'h:mm a')}
                    {event.end_date && (
                      <> - {format(new Date(event.end_date), 'h:mm a')}</>
                    )}
                  </div>
                </div>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    {event.venue_name && (
                      <div className="font-medium">{event.venue_name}</div>
                    )}
                    <div className="text-muted-foreground">
                      {event.location}
                      {event.address && `, ${event.address}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {event.max_attendees && (
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Capacity</div>
                    <div className="text-muted-foreground">
                      Maximum {event.max_attendees} attendees
                    </div>
                  </div>
                </div>
              )}
              
              {event.registration_required && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="font-medium text-blue-900 dark:text-blue-300">
                    Registration Required
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-400">
                    Please register before attending this event
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Contract Management Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Event Management</h4>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Navigate to contract management for this event
                    window.location.href = `/event-planner?eventId=${event.id}`;
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Contracts
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Navigate to budget planning for this event
                    window.location.href = `/event-planner?eventId=${event.id}&tab=budget`;
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Budget Planning
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This event is automatically synced with the contract and budget management system. 
              You can manage performer contracts and event budgets from the Event Planner.
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button onClick={handleAddToCalendar} variant="outline">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Add to Calendar
            </Button>
            
            {event.location && (
              <Button 
                variant="outline"
                onClick={() => {
                  const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(event.location + (event.address ? `, ${event.address}` : ''))}`;
                  window.open(mapsUrl, '_blank');
                }}
              >
                <MapPinIcon className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};