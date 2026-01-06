import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  CalendarIcon, 
  MapPinIcon, 
  ClockIcon, 
  UsersIcon, 
  FileText, 
  DollarSign, 
  EditIcon, 
  ExternalLink,
  Navigation,
  ListChecks,
  Settings2
} from "lucide-react";
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

  const handleGetDirections = () => {
    const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(event.location + (event.address ? `, ${event.address}` : ''))}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header Section */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <DialogHeader className="p-4 sm:p-6 pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl sm:text-2xl font-bold break-words leading-tight">
                    {event.title}
                  </DialogTitle>
                </div>
                {canEdit && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditOpen(true)}
                    className="flex-shrink-0 gap-2"
                  >
                    <EditIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${getEventTypeColor(event.event_type)} font-medium`}>
                  {event.event_type || 'Event'}
                </Badge>
                {event.status && event.status !== 'scheduled' && (
                  <Badge 
                    variant="outline"
                    className={
                      event.status === 'confirmed' ? 'border-green-500 text-green-700 dark:text-green-400' :
                      event.status === 'cancelled' ? 'border-red-500 text-red-700 dark:text-red-400' :
                      event.status === 'postponed' ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400' :
                      'border-muted-foreground'
                    }
                  >
                    {event.status}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <div className="p-4 sm:p-6 pt-4 space-y-6">
          {/* Date & Time Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-8" />
                <Separator className="sm:hidden" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {format(new Date(event.start_date), 'h:mm a')}
                      {event.end_date && (
                        <span className="text-muted-foreground"> – {format(new Date(event.end_date), 'h:mm a')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Image */}
          {event.image_url && (
            <div className="rounded-xl overflow-hidden border shadow-sm">
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full h-48 sm:h-64 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Description */}
          {event.description && (
            <div>
              <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Description</h4>
              <p className="text-foreground leading-relaxed">{event.description}</p>
            </div>
          )}
          
          {/* Location */}
          {event.location && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-secondary/50 rounded-lg mt-0.5">
                      <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      {event.venue_name && (
                        <div className="font-semibold">{event.venue_name}</div>
                      )}
                      <div className="text-muted-foreground">
                        {event.location}
                        {event.address && <span>, {event.address}</span>}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGetDirections}
                    className="flex-shrink-0 gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    <span className="hidden sm:inline">Directions</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Capacity & Registration */}
          {(event.max_attendees || event.registration_required) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {event.max_attendees && (
                <Card className="flex-1">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-secondary/50 rounded-lg">
                      <UsersIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Capacity</div>
                      <div className="font-semibold">{event.max_attendees} attendees</div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {event.registration_required && (
                <Card className="flex-1 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <ListChecks className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-blue-900 dark:text-blue-300">Registration Required</div>
                      <div className="text-sm text-blue-700 dark:text-blue-400">Please register before attending</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {/* Admin Management Section */}
          {canEdit && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold text-lg">Event Management</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <EventClassListManager
                    eventId={event.id}
                    eventTitle={event.title}
                  />
                  
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/event-planner?eventId=${event.id}`)}
                    className="h-auto py-4 flex-col gap-2 hover:bg-secondary/80"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Contracts</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/event-planner?eventId=${event.id}&tab=budget`)}
                    className="h-auto py-4 flex-col gap-2 hover:bg-secondary/80"
                  >
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Budget</span>
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Manage class lists, performer contracts, and event budgets from the Event Planner.
                </p>
              </div>
            </>
          )}
          
          {/* Quick Actions */}
          <Separator />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleAddToCalendar} 
              variant="default"
              className="flex-1 gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Add to Google Calendar
            </Button>
            
            {event.location && (
              <Button 
                variant="outline"
                onClick={handleGetDirections}
                className="flex-1 gap-2"
              >
                <MapPinIcon className="h-4 w-4" />
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
