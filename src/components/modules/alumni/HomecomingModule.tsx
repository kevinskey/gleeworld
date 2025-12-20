import { useState, useEffect } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Home, Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

interface HomecomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  capacity?: number;
  registered?: number;
}

export function HomecomingModule({ user, isFullPage }: ModuleProps) {
  const [events, setEvents] = useState<HomecomingEvent[]>([
    {
      id: '1',
      title: 'Homecoming Concert',
      date: '2025-10-18',
      time: '7:00 PM',
      location: 'Sisters Chapel',
      description: 'Join us for a special Homecoming performance featuring current members and alumni.',
      capacity: 500,
      registered: 245
    },
    {
      id: '2',
      title: 'Alumni Brunch',
      date: '2025-10-19',
      time: '10:00 AM',
      location: 'Alma Upshaw Dining Hall',
      description: 'Reconnect with fellow Glee Club alumni over brunch.',
      capacity: 150,
      registered: 89
    },
    {
      id: '3',
      title: 'Reunion Rehearsal',
      date: '2025-10-18',
      time: '2:00 PM',
      location: 'Glee Club Room',
      description: 'Rehearsal for alumni who want to perform with the current members.',
      capacity: 60,
      registered: 42
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleRSVP = (eventId: string) => {
    toast.success('RSVP submitted! Check your email for confirmation.');
    setEvents(events.map(e => 
      e.id === eventId 
        ? { ...e, registered: (e.registered || 0) + 1 } 
        : e
    ));
  };

  return (
    <ModuleWrapper
      title="Homecoming"
      icon={Home}
    >
      <div className="space-y-6">
        {/* Hero banner */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-background border-primary/20">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-2">Spelman Homecoming 2025</h2>
            <p className="text-muted-foreground mb-4">
              Welcome back, Glee Club sisters! Join us for a weekend of music, memories, and sisterhood.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Badge variant="outline" className="gap-2 py-2 px-4">
                <Calendar className="h-4 w-4" />
                October 17-20, 2025
              </Badge>
              <Badge variant="outline" className="gap-2 py-2 px-4">
                <MapPin className="h-4 w-4" />
                Spelman College Campus
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Events list */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Upcoming Events</h3>
          <div className="grid gap-4">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription className="mt-1">{event.description}</CardDescription>
                    </div>
                    <Button onClick={() => handleRSVP(event.id)}>
                      <Ticket className="h-4 w-4 mr-2" />
                      RSVP
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.date).toLocaleDateString()} at {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                    {event.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.registered || 0}/{event.capacity} registered
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ModuleWrapper>
  );
}

export default HomecomingModule;
