import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MemberCalendarPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
            <p className="text-sm text-muted-foreground">5 rehearsals</p>
          </Card>
          <Card className="p-4 text-center bg-blue-50 border-blue-200">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Next Event</h3>
            <p className="text-sm text-muted-foreground">Tonight 6PM</p>
          </Card>
          <Card className="p-4 text-center bg-purple-50 border-purple-200">
            <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold">Performances</h3>
            <p className="text-sm text-muted-foreground">2 this month</p>
          </Card>
          <Card className="p-4 text-center bg-orange-50 border-orange-200">
            <Bell className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <h3 className="font-semibold">Reminders</h3>
            <p className="text-sm text-muted-foreground">3 active</p>
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
                <div className="space-y-4">
                  {[
                    {
                      title: "Tuesday Rehearsal",
                      date: "Today",
                      time: "6:00 PM - 8:00 PM",
                      location: "Tapley Hall",
                      type: "rehearsal",
                      required: true
                    },
                    {
                      title: "Section Rehearsal - Soprano",
                      date: "Tomorrow",
                      time: "4:00 PM - 5:30 PM",
                      location: "Music Room 201",
                      type: "sectional",
                      required: true
                    },
                    {
                      title: "Spring Concert",
                      date: "March 15",
                      time: "7:30 PM - 9:30 PM",
                      location: "Spelman Auditorium",
                      type: "performance",
                      required: true
                    },
                    {
                      title: "Community Outreach Performance",
                      date: "March 22",
                      time: "2:00 PM - 4:00 PM",
                      location: "Downtown Community Center",
                      type: "performance",
                      required: false
                    },
                    {
                      title: "Uniform Fitting",
                      date: "March 8",
                      time: "3:00 PM - 5:00 PM",
                      location: "Wardrobe Room",
                      type: "fitting",
                      required: true
                    }
                  ].map((event, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full mt-2 ${
                          event.type === 'performance' ? 'bg-purple-500' :
                          event.type === 'rehearsal' ? 'bg-blue-500' :
                          event.type === 'sectional' ? 'bg-green-500' :
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
                                {event.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant={event.required ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {event.required ? 'Required' : 'Optional'}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {event.type}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button size="sm" variant="outline">
                              Details
                            </Button>
                            {event.type === 'rehearsal' && (
                              <Button size="sm" variant="outline">
                                RSVP
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <span className="font-semibold">5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sectionals</span>
                    <span className="font-semibold">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Performances</span>
                    <span className="font-semibold">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Hours</span>
                    <span className="font-semibold">12</span>
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