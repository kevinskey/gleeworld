import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePublicGleeWorldEvents } from '@/hooks/usePublicGleeWorldEvents';
import { BackNavigation } from '@/components/shared/BackNavigation';

const MemberCalendarPage = () => {
  const { events, loading, getUpcomingEvents } = usePublicGleeWorldEvents();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const upcomingEvents = getUpcomingEvents(10);
  const thisWeekEvents = events.filter(event => {
    const eventDate = new Date(event.start_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate >= today && eventDate <= weekFromNow;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Navigation */}
        <BackNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg p-3 bg-green-100 text-green-600">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Calendar</h1>
            <p className="text-muted-foreground">View your rehearsals, performances, and events</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 text-center bg-green-50 border-green-200">
            <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">This Week</h3>
            <p className="text-sm text-muted-foreground">{thisWeekEvents.length} events</p>
          </Card>
          <Card className="p-4 text-center bg-blue-50 border-blue-200">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Total Events</h3>
            <p className="text-sm text-muted-foreground">{events.length} scheduled</p>
          </Card>
          <Card className="p-4 text-center bg-purple-50 border-purple-200">
            <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold">Upcoming</h3>
            <p className="text-sm text-muted-foreground">{upcomingEvents.length} events</p>
          </Card>
          <Card className="p-4 text-center bg-orange-50 border-orange-200">
            <Bell className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <h3 className="font-semibold">Performance Type</h3>
            <p className="text-sm text-muted-foreground">{events.filter(e => e.event_type === 'performance').length} concerts</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Calendar Events */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming events scheduled.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full mt-2 ${
                            event.event_type === 'performance' ? 'bg-purple-500' :
                            event.event_type === 'rehearsal' ? 'bg-blue-500' :
                            event.event_type === 'meeting' ? 'bg-green-500' :
                            'bg-orange-500'
                          }`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-foreground">{event.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {new Date(event.start_date).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  All Day
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {event.event_type || 'event'}
                                </Badge>
                                {event.is_public && (
                                  <Badge variant="secondary" className="text-xs">
                                    Public
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button size="sm" variant="outline">
                                Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* This Week Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Rehearsals</span>
                    <span className="font-semibold">{thisWeekEvents.filter(e => e.event_type === 'rehearsal').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Meetings</span>
                    <span className="font-semibold">{thisWeekEvents.filter(e => e.event_type === 'meeting').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Performances</span>
                    <span className="font-semibold">{thisWeekEvents.filter(e => e.event_type === 'performance').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Events</span>
                    <span className="font-semibold">{thisWeekEvents.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Add to Personal Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Set Reminders
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Request Time Off
                </Button>
              </CardContent>
            </Card>

            {/* Reminders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Rehearsal tonight at 6 PM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Sectional tomorrow at 4 PM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Spring Concert in 10 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCalendarPage;