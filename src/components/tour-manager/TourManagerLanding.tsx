import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, FileText, ClipboardList, ChevronRight, MapPinned, UserCheck, Phone, Music, BookOpen, DollarSign, Mic2, UsersRound, CalendarDays, ExternalLink, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, isWithinInterval } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { TourMilestones } from './TourMilestones';
import { TourRouteTimeline } from './TourRouteTimeline';
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
interface ContractTourDate {
  id: string;
  title: string;
  status: string;
  contract_metadata: {
    performance_date?: string;
    venue_name?: string;
    venue_city?: string;
    venue_state?: string;
    host_name?: string;
  } | null;
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
  const [contractTourDates, setContractTourDates] = useState<ContractTourDate[]>([]);
  const [tourTitle, setTourTitle] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [tourEvents, setTourEvents] = useState<{ id: string; title: string; start_date: string; end_date: string | null; location: string | null; venue_name: string | null; event_type: string | null }[]>([]);

  useEffect(() => {
    const fetchTourEvents = async () => {
      const { data } = await supabase
        .from('gw_tour_events')
        .select('id, title, start_date, end_date, location, venue_name, event_type')
        .order('start_date', { ascending: true });
      if (data) setTourEvents(data);
    };
    fetchTourEvents();
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  const getEventsForDay = (day: Date) => {
    return tourEvents.filter(event => {
      const eventStart = new Date(event.start_date);
      if (isSameDay(eventStart, day)) return true;
      if (event.end_date) {
        const eventEnd = new Date(event.end_date);
        return isWithinInterval(day, { start: eventStart, end: eventEnd });
      }
      return false;
    });
  };

  useEffect(() => {
    const fetchContractTourDates = async () => {
      const today = new Date().toISOString().split('T')[0];
      const {
        data
      } = await supabase.from('contracts_v2').select('id, title, status, contract_metadata').not('contract_metadata->performance_date', 'is', null).gte('contract_metadata->performance_date', today).in('status', ['completed', 'pending', 'sent']).order('contract_metadata->performance_date', {
        ascending: true
      }).limit(5);
      if (data) {
        setContractTourDates(data as ContractTourDate[]);
      }
    };
    fetchContractTourDates();
  }, []);
  const [keyPersonnel, setKeyPersonnel] = useState<KeyPerson[]>([{
    role: 'Tour Manager',
    name: 'Aaliyah Deere',
    icon: Users
  }, {
    role: 'Tour Manager',
    name: 'Onnesty Peele',
    icon: Users
  }]);
  const [sectionLeaders, setSectionLeaders] = useState<KeyPerson[]>([]);
  const defaultStats = {
    upcomingDates: stats?.upcomingDates ?? 0,
    activeRoutes: stats?.activeRoutes ?? 0,
    contacts: stats?.contacts ?? 0,
    pendingContracts: stats?.pendingContracts ?? 0,
    rosterCount: stats?.rosterCount ?? 0,
    pendingDocs: stats?.pendingDocs ?? 0
  };
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
  return <div className="space-y-4">
      {/* Mini Weekly Calendar */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Tour Schedule
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(prev => subWeeks(prev, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(prev => addWeeks(prev, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="flex flex-col items-center">
                  <span className="text-[10px] uppercase text-muted-foreground font-medium">
                    {format(day, 'EEE')}
                  </span>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mt-0.5",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                    dayEvents.length > 0 && !isToday && "ring-2 ring-primary/30"
                  )}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
          {/* Events for the week */}
          {(() => {
            const allWeekEvents = weekDays.flatMap(day => 
              getEventsForDay(day).map(e => ({ ...e, displayDate: day }))
            );
            // Deduplicate by event id
            const seen = new Set<string>();
            const unique = allWeekEvents.filter(e => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            });
            if (unique.length === 0) return (
              <p className="text-xs text-muted-foreground text-center mt-3">No tour events this week</p>
            );
            return (
              <div className="mt-3 space-y-1.5 border-t pt-3">
                {unique.slice(0, 4).map(event => (
                  <div key={event.id} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onNavigate('tour-dates')}>
                    <div className="w-1 h-8 rounded-full bg-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-foreground">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {format(new Date(event.start_date), 'EEE, MMM d · h:mm a')}
                        {event.venue_name && ` · ${event.venue_name}`}
                      </p>
                    </div>
                  </div>
                ))}
                {unique.length > 4 && (
                  <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => onNavigate('tour-dates')}>
                    +{unique.length - 4} more events
                  </Button>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Tour Milestones */}
      <TourMilestones />

      {/* Compact Stats Row */}
      <div className="hidden md:grid grid-cols-6 gap-2">
        {sections.map(section => <button key={section.id} onClick={() => onNavigate(section.id)} className="text-center p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="text-xl font-bold text-foreground">{section.stat}</div>
            <div className="text-[10px] capitalize text-slate-950">{section.statLabel}</div>
          </button>)}
      </div>

      {/* Two Column Layout: Route & Upcoming Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tour Route Timeline */}
        
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
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">No personnel assigned</p>
                <p className="text-xs mt-1 text-muted-foreground">Configure tour personnel in settings</p>
              </div> : <div className="grid grid-cols-2 gap-2">
                {keyPersonnel.map(person => <div key={`${person.role}-${person.name}`} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-foreground">{person.name}</p>
                      <p className="text-[10px] truncate text-muted-foreground">{person.role}</p>
                    </div>
                  </div>)}
              </div>}
            
            {/* Section Leaders */}
            {sectionLeaders.length > 0 && <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium mb-2">Section Leaders</p>
                <div className="grid grid-cols-2 gap-2">
                  {sectionLeaders.map(person => <div key={person.role} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Music className="h-3 w-3 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium truncate text-muted-foreground">{person.role}: {person.name}</p>
                      </div>
                    </div>)}
                </div>
              </div>}
          </CardContent>
        </Card>
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
            {contractTourDates.length === 0 ? <div className="text-center py-6">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming dates</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate('contracts')}>
                  View Contracts
                </Button>
              </div> : <div className="space-y-2">
                {contractTourDates.map(contract => {
              const meta = contract.contract_metadata;
              const performanceDate = meta?.performance_date ? new Date(meta.performance_date) : null;
              const location = [meta?.venue_city, meta?.venue_state].filter(Boolean).join(', ');
              return <div key={contract.id} className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onNavigate('contracts')}>
                      <div className="flex-shrink-0 w-10 text-center">
                        {performanceDate ? <>
                            <div className="text-lg font-bold leading-none text-foreground">
                              {format(performanceDate, 'd')}
                            </div>
                            <div className="text-[10px] uppercase text-muted-foreground">
                              {format(performanceDate, 'MMM')}
                            </div>
                          </> : <div className="text-xs text-muted-foreground">TBD</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-foreground">
                          {meta?.host_name || contract.title}
                        </p>
                        {(meta?.venue_name || location) && <p className="text-xs flex items-center gap-1 truncate text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {meta?.venue_name || location}
                          </p>}
                      </div>
                      <Badge variant={contract.status === 'completed' ? 'default' : 'outline'} className="text-[10px] flex-shrink-0">
                        {contract.status === 'completed' ? 'Signed' : contract.status}
                      </Badge>
                    </div>;
            })}
              </div>}
            
            {/* Calendar Integration Note */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-[10px] flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                Tour dates from signed contracts
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      

      {/* Section Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {sections.map(section => <button key={section.id} onClick={() => onNavigate(section.id)} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left">
            <section.icon className={cn("h-5 w-5 mb-2", section.color.replace('bg-', 'text-'))} />
            <div className="text-sm font-medium">{section.title}</div>
            <div className="text-xs text-muted-foreground">{section.stat} {section.statLabel}</div>
          </button>)}
      </div>
    </div>;
};