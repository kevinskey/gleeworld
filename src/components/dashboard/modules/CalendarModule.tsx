import React, { useState } from 'react';
import { Calendar, Plus, Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CalendarModule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('upcoming');

  const events = [
    {
      id: 1,
      title: 'Weekly Rehearsal',
      date: '2024-01-15',
      time: '7:00 PM - 9:00 PM',
      location: 'Sisters Chapel',
      type: 'rehearsal',
      attendees: 45,
      description: 'Regular weekly rehearsal for all members'
    },
    {
      id: 2,
      title: 'Spring Concert Preparation',
      date: '2024-01-18',
      time: '6:00 PM - 8:00 PM',
      location: 'Music Hall',
      type: 'concert',
      attendees: 50,
      description: 'Final preparation for the Spring concert'
    },
    {
      id: 3,
      title: 'Alumni Homecoming Performance',
      date: '2024-01-22',
      time: '3:00 PM - 5:00 PM',
      location: 'Spelman Campus',
      type: 'performance',
      attendees: 35,
      description: 'Special performance for alumni weekend'
    },
    {
      id: 4,
      title: 'Section Rehearsal - Soprano',
      date: '2024-01-16',
      time: '5:00 PM - 6:30 PM',
      location: 'Practice Room 1',
      type: 'rehearsal',
      attendees: 12,
      description: 'Soprano section rehearsal'
    }
  ];

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'rehearsal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concert': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'performance': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-sans font-semibold tracking-tight text-base sm:text-lg md:text-xl">Calendar</h2>
              <p className="text-muted-foreground">Stay on top of rehearsals, concerts, and events</p>
            </div>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <h3 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="sm">
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">Month View</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{event.attendees} attendees</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={getEventTypeColor(event.type)}>
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="week" className="mt-6">
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Week View</p>
              <p className="text-muted-foreground">Weekly calendar view coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="month" className="mt-6">
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Month View</p>
              <p className="text-muted-foreground">Monthly calendar grid coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};