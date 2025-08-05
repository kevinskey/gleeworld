import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Users, MapPin } from "lucide-react";
import { ModuleProps } from "@/types/modules";

export const SchedulingModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const upcomingEvents = [
    { id: 1, title: "Section Rehearsal - Sopranos", date: "Jan 15, 2024", time: "6:00 PM", location: "Music Room A", attendees: 12 },
    { id: 2, title: "Full Ensemble Rehearsal", date: "Jan 16, 2024", time: "7:00 PM", location: "Main Hall", attendees: 48 },
    { id: 3, title: "Spring Concert Prep", date: "Jan 18, 2024", time: "5:30 PM", location: "Performance Hall", attendees: 52 }
  ];

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Scheduling Module</h1>
            <p className="text-muted-foreground">Schedule and manage rehearsals, events, and meetings</p>
          </div>
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">23</div>
              <div className="text-sm text-muted-foreground">Events This Week</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">156</div>
              <div className="text-sm text-muted-foreground">Total Hours Scheduled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">94%</div>
              <div className="text-sm text-muted-foreground">Attendance Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">8</div>
              <div className="text-sm text-muted-foreground">Rooms Managed</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.date} at {event.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.attendees} attendees
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Confirmed</Badge>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduling
        </CardTitle>
        <CardDescription>Manage rehearsals and events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">23 events this week</div>
          <div className="text-sm">94% attendance rate</div>
          <div className="text-sm">Next: Section Rehearsal - 6:00 PM</div>
        </div>
      </CardContent>
    </Card>
  );
};