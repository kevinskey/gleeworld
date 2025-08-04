import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPinIcon, ClockIcon, UsersIcon, ExternalLinkIcon, FileText, DollarSign, EditIcon, MoreHorizontalIcon } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EditEventDialog } from "./EditEventDialog";
import { EventClassListManager } from "./EventClassListManager";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface EventDetailDialogProps {
  event: GleeWorldEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated?: () => void;
}

export const EventDetailDialog = ({ event, open, onOpenChange, onEventUpdated }: EventDetailDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  
  if (!event) return null;

  const canEdit = user && (user.id === event.created_by || user.role === 'admin' || user.role === 'super-admin');

  const getEventTypeColor = (type: string | null) => {
    switch (type) {
      case 'performance':
        return 'bg-event-performance text-event-performance-fg';
      case 'rehearsal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'sectionals':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
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
      <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-lg sm:text-xl break-words">{event.title}</DialogTitle>
              <Badge className={getEventTypeColor(event.event_type)}>
                {event.event_type || 'Event'}
              </Badge>
              {event.status && event.status !== 'scheduled' && (
                <Badge 
                  className={
                    event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    event.status === 'postponed' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }
                >
                  {event.status}
                </Badge>
              )}
            </div>
            
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover-scale flex-shrink-0">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <EditIcon className="h-4 w-4 mr-2" />
                    Edit Event
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAddToCalendar}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </DropdownMenuItem>
                  {event.location && (
                    <DropdownMenuItem 
                      onClick={() => {
                        const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(event.location + (event.address ? `, ${event.address}` : ''))}`;
                        window.open(mapsUrl, '_blank');
                      }}
                    >
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      Get Directions
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Event Image */}
          {event.image_url && (
            <div>
              <h4 className="font-semibold mb-2">Event Image</h4>
              <div className="w-full max-w-md mx-auto">
                <img 
                  src={event.image_url} 
                  alt={event.title}
                  className="w-full h-48 object-cover rounded-lg border shadow-sm"
                  onError={(e) => {
                    console.log('Failed to load event image:', event.image_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
          
          {event.description && (
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h4 className="font-semibold">Event Management</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                {canEdit && (
                  <EventClassListManager
                    eventId={event.id}
                    eventTitle={event.title}
                  />
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Navigate to contract management for this event
                    navigate(`/event-planner?eventId=${event.id}`);
                  }}
                  className="w-full sm:w-auto"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Contracts
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Navigate to budget planning for this event
                    navigate(`/event-planner?eventId=${event.id}&tab=budget`);
                  }}
                  className="w-full sm:w-auto"
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
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button onClick={handleAddToCalendar} variant="outline" className="w-full sm:w-auto">
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
                className="w-full sm:w-auto"
              >
                <MapPinIcon className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      
      <EditEventDialog
        event={event}
        open={editOpen}
        onOpenChange={setEditOpen}
        onEventUpdated={() => {
          setEditOpen(false);
          onOpenChange(false);
          onEventUpdated?.();
        }}
      />
    </Dialog>
  );
};