import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";

interface Event {
  id: string;
  title: string;
  event_name: string;
  event_type: string;
  event_date_start: string;
  event_date_end?: string;
  location?: string;
  expected_headcount?: number;
  is_travel_involved: boolean;
  brief_description?: string;
  approved: boolean;
  approval_needed: boolean;
  created_at: string;
  no_sing_rest_required?: boolean;
  no_sing_rest_date_start?: string;
  no_sing_rest_date_end?: string;
  faculty_advisor?: string;
}

interface EventDetailsDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const EventDetailsDialog = ({ event, open, onOpenChange, onUpdate }: EventDetailsDialogProps) => {
  const getEventTypeDisplay = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'tour_stop': 'bg-blue-100 text-blue-800',
      'social': 'bg-green-100 text-green-800',
      'banquet': 'bg-purple-100 text-purple-800',
      'fundraiser': 'bg-yellow-100 text-yellow-800',
      'worship_event': 'bg-indigo-100 text-indigo-800',
      'travel': 'bg-orange-100 text-orange-800',
      'volunteer': 'bg-teal-100 text-teal-800',
      'meeting': 'bg-gray-100 text-gray-800',
      'performance': 'bg-red-100 text-red-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-xl">
                {event.event_name || event.title}
              </DialogTitle>
              <div className="flex gap-2">
                <Badge className={getEventTypeColor(event.event_type)}>
                  {getEventTypeDisplay(event.event_type)}
                </Badge>
                {event.approval_needed && (
                  <Badge variant={event.approved ? "default" : "secondary"}>
                    {event.approved ? "Approved" : "Pending Approval"}
                  </Badge>
                )}
                {event.is_travel_involved && (
                  <Badge variant="outline">Travel Required</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Event Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(event.event_date_start)}
                  {event.event_date_end && ` - ${formatDate(event.event_date_end)}`}
                </p>
              </div>
            </div>

            {event.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                </div>
              </div>
            )}

            {event.expected_headcount && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Expected Attendance</p>
                  <p className="text-sm text-muted-foreground">{event.expected_headcount} people</p>
                </div>
              </div>
            )}

            {event.no_sing_rest_required && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">No-Sing Rest Period</p>
                  <p className="text-sm text-muted-foreground">
                    {event.no_sing_rest_date_start && formatDate(event.no_sing_rest_date_start)}
                    {event.no_sing_rest_date_end && ` - ${formatDate(event.no_sing_rest_date_end)}`}
                  </p>
                </div>
              </div>
            )}

            {event.faculty_advisor && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Faculty Advisor</p>
                  <p className="text-sm text-muted-foreground">{event.faculty_advisor}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {event.brief_description && (
            <div>
              <p className="font-medium mb-2">Description</p>
              <p className="text-sm text-muted-foreground">{event.brief_description}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Budget management and team assignment features coming in the next phase.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};