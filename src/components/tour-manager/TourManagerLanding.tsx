import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, FileText, ClipboardList, ChevronRight, MapPinned, UserCheck, Phone, Music, BookOpen, DollarSign, Mic2, UsersRound, CalendarDays, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
interface TourManagerLandingProps {
  onNavigate: (section: string) => void;
  stats?: {
    upcomingDates: number;
    activeRoutes: number;
    contacts: number;
    pendingContracts: number;
    rosterCount: number;
    pendingDocs: number;
  };
}
interface TourEvent {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  location?: string;
  venue_name?: string;
}
interface KeyPerson {
  role: string;
  name: string;
  email?: string;
  avatar?: string;
  icon: React.ElementType;
}
export const TourManagerLanding = ({
  onNavigate,
  stats
}: TourManagerLandingProps) => {
  const navigate = useNavigate();
  const [tourEvents, setTourEvents] = useState<TourEvent[]>([]);
  const [tourTitle, setTourTitle] = useState<string | null>(null);
  const [keyPersonnel, setKeyPersonnel] = useState<KeyPerson[]>([]);
  const [sectionLeaders, setSectionLeaders] = useState<KeyPerson[]>([]);
  const defaultStats = {
    upcomingDates: stats?.upcomingDates ?? 0,
    activeRoutes: stats?.activeRoutes ?? 0,
    contacts: stats?.contacts ?? 0,
    pendingContracts: stats?.pendingContracts ?? 0,
    rosterCount: stats?.rosterCount ?? 0,
    pendingDocs: stats?.pendingDocs ?? 0
  };
  useEffect(() => {
    const fetchTourEvents = async () => {
      const {
        data
      } = await supabase.from('gw_tour_events').select('id, title, start_date, end_date, location, venue_name').gte('start_date', new Date().toISOString()).order('start_date', {
        ascending: true
      }).limit(5);
      if (data) setTourEvents(data);
    };
    fetchTourEvents();
  }, []);
  const sections = [{
    id: 'tour-dates',
    title: 'Dates',
    icon: Calendar,
    color: 'bg-blue-500',
    stat: defaultStats.upcomingDates,
    statLabel: 'upcoming'
  }, {
    id: 'route-planning',
    title: 'Routes',
    icon: MapPin,
    color: 'bg-emerald-500',
    stat: defaultStats.activeRoutes,
    statLabel: 'routes'
  }, {
    id: 'hosts',
    title: 'Contacts',
    icon: Phone,
    color: 'bg-purple-500',
    stat: defaultStats.contacts,
    statLabel: 'contacts'
  }, {
    id: 'contracts',
    title: 'Contracts',
    icon: FileText,
    color: 'bg-amber-500',
    stat: defaultStats.pendingContracts,
    statLabel: 'pending'
  }, {
    id: 'roster',
    title: 'Roster',
    icon: Users,
    color: 'bg-rose-500',
    stat: defaultStats.rosterCount,
    statLabel: 'members'
  }, {
    id: 'documents',
    title: 'Docs',
    icon: ClipboardList,
    color: 'bg-cyan-500',
    stat: defaultStats.pendingDocs,
    statLabel: 'pending'
  }];
  const handleViewCalendar = () => {
    navigate('/calendar');
  };
  return <div className="space-y-4">
      {/* Tour Title & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{tourTitle || 'Tour Overview'}</h2>
          <p className="text-xs text-muted-foreground">
            {tourTitle ? 'Tour overview and key information' : 'No active tour configured'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleViewCalendar} className="gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          View Calendar
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {sections.map(section => <button key={section.id} onClick={() => onNavigate(section.id)} className="text-center p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="text-xl font-bold text-foreground">{section.stat}</div>
            <div className="text-[10px] text-muted-foreground capitalize">{section.statLabel}</div>
          </button>)}
      </div>

      {/* Two Column Layout: Personnel & Upcoming Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Key Personnel */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Key Personnel
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {keyPersonnel.length === 0 ? <div className="text-center py-6">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No personnel assigned</p>
                <p className="text-xs text-muted-foreground mt-1">Configure tour personnel in settings</p>
              </div> : <div className="grid grid-cols-2 gap-2">
                {keyPersonnel.map(person => <div key={person.role} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-primary-foreground">{person.name}</p>
                      <p className="text-[10px] truncate text-blue-50">{person.role}</p>
                    </div>
                  </div>)}
              </div>}
            
            {/* Section Leaders */}
            {sectionLeaders.length > 0 && <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium mb-2 text-primary-foreground">Section Leaders</p>
                <div className="grid grid-cols-2 gap-2">
                  {sectionLeaders.map(person => <div key={person.role} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Music className="h-3 w-3 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium truncate text-accent">{person.role}: {person.name}</p>
                      </div>
                    </div>)}
                </div>
              </div>}
          </CardContent>
        </Card>

        {/* Upcoming Tour Dates */}
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming Tour Dates
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate('tour-dates')}>
                View All
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {tourEvents.length === 0 ? <div className="text-center py-6">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming dates</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate('tour-dates')}>
                  Add Tour Dates
                </Button>
              </div> : <div className="space-y-2">
                {tourEvents.map(event => <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onNavigate('tour-dates')}>
                    <div className="flex-shrink-0 w-10 text-center">
                      <div className="text-lg font-bold leading-none text-primary-foreground">
                        {format(new Date(event.start_date), 'd')}
                      </div>
                      <div className="text-[10px] uppercase text-primary-foreground">
                        {format(new Date(event.start_date), 'MMM')}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-primary-foreground">{event.title}</p>
                      {(event.venue_name || event.location) && <p className="text-xs flex items-center gap-1 truncate text-secondary-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {event.venue_name || event.location}
                        </p>}
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0 text-secondary-foreground">
                      {format(new Date(event.start_date), 'EEE')}
                    </Badge>
                  </div>)}
              </div>}
            
            {/* Calendar Integration Note */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Tour dates sync automatically to the main calendar
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      

      {/* Section Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {sections.map(section => {})}
      </div>
    </div>;
};