import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, User, MessageSquare } from "lucide-react";
import { useFirstYearData } from "@/hooks/useFirstYearData";

const officeHours = [
  {
    instructor: "Dr. Johnson",
    role: "Director",
    time: "Tuesdays 2:00-4:00 PM",
    location: "Music Building, Room 201",
    available: true,
    nextSlot: "Today, 3:00 PM"
  },
  {
    instructor: "Prof. Williams",
    role: "Assistant Director",
    time: "Thursdays 1:00-3:00 PM",
    location: "Music Building, Room 105",
    available: false,
    nextSlot: "Thursday, 1:00 PM"
  },
  {
    instructor: "Sarah Chen",
    role: "First-Year Coordinator",
    time: "Mon, Wed, Fri 10:00-11:00 AM",
    location: "Music Building, Room 150",
    available: true,
    nextSlot: "Tomorrow, 10:00 AM"
  }
];

const upcomingEvents = [
  {
    title: "First-Year Voice Workshop",
    date: "Friday, Feb 16",
    time: "4:00 PM",
    location: "Recital Hall"
  },
  {
    title: "Study Group Session",
    date: "Sunday, Feb 18",
    time: "2:00 PM",
    location: "Music Library"
  }
];

export const OfficeHours = () => {
  const { studentRecord } = useFirstYearData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Office Hours & Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Office Hours */}
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
            Office Hours
          </h4>
          <div className="space-y-3">
            {officeHours.map((hour, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-semibold text-sm">{hour.instructor}</h5>
                      <Badge variant="outline" className="text-xs">
                        {hour.role}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {hour.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {hour.location}
                      </div>
                    </div>
                  </div>
                  <Badge variant={hour.available ? "default" : "secondary"}>
                    {hour.available ? "Available" : "Busy"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Next: {hour.nextSlot}
                  </span>
                  <Button size="sm" variant="outline" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
            Upcoming Events
          </h4>
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg border-l-4 border-l-primary bg-primary/5"
              >
                <h5 className="font-semibold text-sm mb-1">{event.title}</h5>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {event.date} at {event.time}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {event.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              📧 Email Coordinator
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              📅 View Full Calendar
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              ❓ Submit Question
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};