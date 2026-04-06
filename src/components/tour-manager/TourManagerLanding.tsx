import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, MapPin, Users, FileText, ClipboardList, ChevronRight, MapPinned, UserCheck, Phone, Music, BookOpen, DollarSign, Mic2, UsersRound, CalendarDays, ExternalLink, ChevronLeft, ChevronDown, Bus, Building2, FileCheck, Upload, Eye, Wallet, Plus, Pencil, Trash2, AlertTriangle, Hotel, Clock, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, isWithinInterval } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { TourMilestones } from './TourMilestones';
import { TourRouteTimeline } from './TourRouteTimeline';
import { TourStopDetailDialog, type TourStopFull } from './TourStopDetailDialog';
import { TourStopEditForm } from './TourStopEditForm';
import { CreateTourGroupButton } from '@/components/tour/CreateTourGroupButton';
import { exportItineraryPdf, exportRosterPdf } from '@/utils/tourPdfExport';
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
  const [tourEvents, setTourEvents] = useState<TourStopFull[]>([]);
  const [selectedStop, setSelectedStop] = useState<TourStopFull | null>(null);
  const [editingStop, setEditingStop] = useState<TourStopFull | null>(null);
  const [rosterMembers, setRosterMembers] = useState<{ id: string; full_name: string; voice_part: string | null; status: string }[]>([]);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [hostsOpen, setHostsOpen] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [busOpen, setBusOpen] = useState(false);
  const [hotelsOpen, setHotelsOpen] = useState(false);
  const [hosts, setHosts] = useState<{ id: string; contact_name: string; organization_name: string; contact_phone: string | null; city: string | null; state: string | null; status: string }[]>([]);
  const [contracts, setContracts] = useState<{ id: string; title: string; status: string }[]>([]);
  const [budgets, setBudgets] = useState<{ id: string; title: string; description: string | null; total_amount: number; spent_amount: number; remaining_amount: number | null; budget_type: string; status: string; start_date: string; end_date: string | null }[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<{ id: string; budget_id: string; name: string; allocated_amount: number; spent_amount: number; remaining_amount: number | null }[]>([]);
  const [busCompanies, setBusCompanies] = useState<{ id: string; company_name: string; contact_name: string | null; contact_phone: string | null; driver_name: string | null; driver_phone: string | null; contract_pdf_url: string | null }[]>([]);
  const [citiesWithoutHotels, setCitiesWithoutHotels] = useState<{ id: string; city_name: string; state_code: string | null; arrival_date: string | null }[]>([]);

  useEffect(() => {
    const fetchTourEvents = async () => {
      const { data } = await supabase
        .from('gw_tour_events')
        .select('*')
        .order('start_date', { ascending: true });
      if (data) setTourEvents(data as TourStopFull[]);
    };
    const fetchTourName = async () => {
      const { data } = await supabase
        .from('gw_tours')
        .select('name')
        .eq('status', 'planning')
        .limit(1)
        .single();
      if (data) setTourTitle(data.name);
    };
    const fetchRoster = async () => {
      const { data: roster } = await supabase
        .from('gw_tour_roster')
        .select('id, status, user_id')
        .eq('status', 'confirmed');
      if (!roster || roster.length === 0) return;
      const userIds = roster.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, voice_part')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setRosterMembers(roster.map(r => {
        const p = profileMap.get(r.user_id);
        return {
          id: r.id,
          full_name: p?.full_name || 'Unknown',
          voice_part: p?.voice_part || null,
          status: r.status,
        };
      }).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    };
    const fetchHosts = async () => {
      const { data } = await supabase
        .from('hosts')
        .select('id, contact_name, organization_name, contact_phone, city, state, status')
        .order('contact_name');
      if (data) setHosts(data);
    };
    const fetchContracts = async () => {
      const { data } = await supabase
        .from('contracts_v2')
        .select('id, title, status')
        .order('created_at', { ascending: false });
      if (data) setContracts(data);
    };
    const fetchBusCompanies = async () => {
      const { data } = await supabase
        .from('gw_tour_bus_companies')
        .select('id, company_name, contact_name, contact_phone, driver_name, driver_phone, contract_pdf_url')
        .eq('is_active', true)
        .order('company_name');
      if (data) setBusCompanies(data);
    };
    const fetchBudgets = async () => {
      const { data } = await supabase
        .from('budgets')
        .select('id, title, description, total_amount, spent_amount, remaining_amount, budget_type, status, start_date, end_date')
        .eq('budget_type', 'tour')
        .order('created_at', { ascending: false });
      if (data) setBudgets(data);
    };
    const fetchBudgetCategories = async () => {
      const { data } = await supabase
        .from('budget_categories')
        .select('id, budget_id, name, allocated_amount, spent_amount, remaining_amount')
        .order('name');
      if (data) setBudgetCategories(data);
    };
    const fetchHotelGaps = async () => {
      // Get all tour cities
      const { data: cities } = await supabase
        .from('gw_tour_cities')
        .select('id, city_name, state_code, arrival_date')
        .order('arrival_date', { ascending: true });
      if (!cities || cities.length === 0) return;
      // Get all hotels linked to cities
      const { data: hotels } = await supabase
        .from('gw_tour_hotels')
        .select('tour_city_id')
        .not('tour_city_id', 'is', null);
      const coveredCityIds = new Set((hotels || []).map(h => h.tour_city_id));
      const gaps = cities.filter(c => !coveredCityIds.has(c.id));
      setCitiesWithoutHotels(gaps);
    };
    fetchTourEvents();
    fetchRoster();
    fetchHosts();
    fetchContracts();
    fetchBusCompanies();
    fetchBudgets();
    fetchBudgetCategories();
    fetchHotelGaps();
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
  }, {
    role: 'Tour Manager',
    name: 'Soleil',
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

      {/* Hotels Section */}
      <Collapsible open={hotelsOpen} onOpenChange={setHotelsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-primary" />
                  Hotels
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", hotelsOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground text-center py-4">Manage hotel assignments for tour cities</p>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onNavigate('hotels')}>
                Manage Hotels <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tour Itinerary - Grouped by City */}
      {(() => {
        // Group tour events by city (extracted from location field)
        const getCityKey = (event: TourStopFull) => {
          if (!event.location) return 'Unknown Location';
          // Extract city from "City, ST" format
          return event.location.split(',')[0].trim() || event.location;
        };

        const cityGroups = tourEvents.reduce<Record<string, { cityLabel: string; events: TourStopFull[] }>>((acc, event) => {
          const cityKey = getCityKey(event);
          if (!acc[cityKey]) {
            acc[cityKey] = { cityLabel: event.location || cityKey, events: [] };
          }
          acc[cityKey].events.push(event);
          return acc;
        }, {});

        // Sort cities by earliest event date
        const sortedCities = Object.entries(cityGroups).sort(([, a], [, b]) => {
          const aDate = new Date(a.events[0]?.start_date || 0);
          const bDate = new Date(b.events[0]?.start_date || 0);
          return aDate.getTime() - bDate.getTime();
        });

        return (
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPinned className="h-4 w-4 text-primary" />
                  Tour Itinerary
                  <Badge variant="secondary" className="text-[10px] ml-1">{tourEvents.length} stops</Badge>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => exportItineraryPdf(tourEvents, tourTitle || undefined)}>
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate('tour-dates')}>
                    Manage <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {tourEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No itinerary events yet</p>
              ) : (
                <div className="space-y-2">
                  {sortedCities.map(([cityKey, { cityLabel, events: cityEvents }]) => {
                    const earliestDate = new Date(cityEvents[0]?.start_date);
                    const latestDate = cityEvents.length > 1 ? new Date(cityEvents[cityEvents.length - 1]?.start_date) : null;
                    const hasPerformance = cityEvents.some(e => e.event_type === 'performance');
                    const allPast = cityEvents.every(e => new Date(e.start_date) < new Date());
                    const hasToday = cityEvents.some(e => isSameDay(new Date(e.start_date), new Date()));

                    return (
                      <Collapsible key={cityKey} defaultOpen={hasToday || !allPast}>
                        <Card className={cn("border", hasToday && "ring-2 ring-primary/40", allPast && !hasToday && "opacity-60")}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", hasPerformance ? "bg-primary/10" : "bg-muted")}>
                                <MapPin className={cn("h-4 w-4", hasPerformance ? "text-primary" : "text-muted-foreground")} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{cityKey}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {format(earliestDate, 'MMM d')}
                                  {latestDate && ` – ${format(latestDate, 'MMM d')}`}
                                  {' · '}{cityEvents.length} event{cityEvents.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {hasToday && <Badge className="text-[8px] h-4 px-1 bg-primary">Now</Badge>}
                                {hasPerformance && <Badge variant="outline" className="text-[8px] h-4 px-1">🎶</Badge>}
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-1.5 border-t">
                              {cityEvents.map((event) => {
                                const eventDate = new Date(event.start_date);
                                const isPast = eventDate < new Date();
                                const isEventToday = isSameDay(eventDate, new Date());
                                const typeColors: Record<string, string> = {
                                  performance: 'bg-primary',
                                  travel: 'bg-amber-500',
                                  free: 'bg-emerald-500',
                                  workshop: 'bg-violet-500',
                                };
                                const dotColor = typeColors[event.event_type || ''] || 'bg-muted-foreground';

                                return (
                                  <div
                                    key={event.id}
                                    className={cn(
                                      "flex gap-2.5 py-2 px-2 rounded-md cursor-pointer hover:bg-muted/40 transition-colors mt-1.5",
                                      isPast && !isEventToday && "opacity-50"
                                    )}
                                    onClick={() => setSelectedStop(event)}
                                  >
                                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5", isEventToday ? "bg-primary animate-pulse" : dotColor)} />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-medium text-muted-foreground">
                                          {format(eventDate, 'EEE, MMM d')}
                                        </span>
                                        {isEventToday && <Badge className="text-[8px] h-4 px-1 bg-primary">Today</Badge>}
                                        {event.event_type && (
                                          <Badge variant="outline" className="text-[8px] h-4 px-1 capitalize">{event.event_type}</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs font-medium text-foreground">{event.title}</p>
                                      {/* Show full details */}
                                      {event.venue_name && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                          <Building2 className="h-2.5 w-2.5 flex-shrink-0" /> {event.venue_name}
                                        </p>
                                      )}
                                      {(event.concert_time || event.arrival_time) && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                          <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                                          {event.concert_time ? `Concert: ${event.concert_time}` : `Arrival: ${event.arrival_time}`}
                                        </p>
                                      )}
                                      {event.host_name && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                          <Users className="h-2.5 w-2.5 flex-shrink-0" /> Host: {event.host_name}
                                        </p>
                                      )}
                                      {event.lodging_name && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                          <Hotel className="h-2.5 w-2.5 flex-shrink-0" /> {event.lodging_name}
                                        </p>
                                      )}
                                      {event.meal_info && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                          🍽️ {event.meal_info}
                                        </p>
                                      )}
                                      {event.description && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <Collapsible open={rosterOpen} onOpenChange={setRosterOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Tour Roster
                  <Badge variant="secondary" className="text-[10px] ml-1">{rosterMembers.length}</Badge>
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", rosterOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              {rosterMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No confirmed roster members</p>
              ) : (
                <>
                  {/* Group by voice part */}
                  {(['S1', 'S2', 'A1', 'A2'] as const).map(part => {
                    const members = rosterMembers.filter(m => m.voice_part === part);
                    if (members.length === 0) return null;
                    return (
                      <div key={part} className="mb-3 last:mb-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">{part} · {members.length}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {members.map(m => (
                            <div key={m.id} className="flex items-center gap-1.5 p-1 rounded-md">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                  {m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate text-foreground">{m.full_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Unassigned */}
                  {(() => {
                    const unassigned = rosterMembers.filter(m => !m.voice_part || !['S1','S2','A1','A2'].includes(m.voice_part));
                    if (unassigned.length === 0) return null;
                    return (
                      <div className="mb-3 last:mb-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Unassigned · {unassigned.length}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {unassigned.map(m => (
                            <div key={m.id} className="flex items-center gap-1.5 p-1 rounded-md">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                                  {m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate text-foreground">{m.full_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => onNavigate('roster')}>
                      Manage Roster
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => exportRosterPdf(rosterMembers, tourTitle || undefined)}>
                      <Download className="h-3 w-3 mr-1" /> PDF
                    </Button>
                    <CreateTourGroupButton />
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Hosts Section */}
      <Collapsible open={hostsOpen} onOpenChange={setHostsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Tour Hosts
                  <Badge variant="secondary" className="text-[10px] ml-1">{hosts.length}</Badge>
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", hostsOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              {hosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hosts added yet</p>
              ) : (
                <div className="space-y-2">
                  {hosts.map(host => (
                    <div key={host.id} className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onNavigate('hosts')}>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{host.organization_name}</p>
                        <p className="text-[10px] text-muted-foreground">{host.contact_name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {host.contact_phone && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Phone className="h-2.5 w-2.5" /> {host.contact_phone}
                            </span>
                          )}
                          {host.city && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {host.city}{host.state ? `, ${host.state}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0 capitalize">{host.status}</Badge>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => onNavigate('hosts')}>
                    Manage Hosts <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Contracts Section */}
      <Collapsible open={contractsOpen} onOpenChange={setContractsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  Contracts
                  <Badge variant="secondary" className="text-[10px] ml-1">{contracts.length}</Badge>
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", contractsOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              {contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No contracts yet</p>
              ) : (
                <div className="space-y-2">
                  {contracts.map(contract => (
                    <div key={contract.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onNavigate('contracts')}>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{contract.title}</p>
                      </div>
                      <Badge variant={contract.status === 'completed' ? 'default' : 'outline'} className="text-[10px] flex-shrink-0 capitalize">
                        {contract.status}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => onNavigate('contracts')}>
                    Manage Contracts <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tour Budgets Section */}
      <Collapsible open={budgetsOpen} onOpenChange={setBudgetsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Tour Budgets
                  <Badge variant="secondary" className="text-[10px] ml-1">{budgets.length}</Badge>
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", budgetsOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              {budgets.length === 0 ? (
                <div className="text-center py-4">
                  <Wallet className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No budgets created yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Add a main tour budget and sub-budgets for expenses</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {budgets.map(budget => {
                    const spent = budget.spent_amount || 0;
                    const total = budget.total_amount || 1;
                    const remaining = budget.remaining_amount ?? (total - spent);
                    const percentUsed = Math.min(Math.round((spent / total) * 100), 100);
                    const categories = budgetCategories.filter(c => c.budget_id === budget.id);
                    const isOverBudget = remaining < 0;

                    return (
                      <div key={budget.id} className="p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-foreground">{budget.title}</p>
                          </div>
                          <Badge variant={budget.status === 'active' ? 'default' : 'outline'} className="text-[10px] capitalize">
                            {budget.status}
                          </Badge>
                        </div>
                        {budget.description && (
                          <p className="text-[10px] text-muted-foreground mb-2">{budget.description}</p>
                        )}

                        {/* Budget progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Spent: ${spent.toLocaleString()}</span>
                            <span className="text-muted-foreground">Total: ${total.toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", isOverBudget ? "bg-destructive" : percentUsed > 80 ? "bg-amber-500" : "bg-primary")}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] mt-1">
                            <span className={cn("font-medium", isOverBudget ? "text-destructive" : "text-foreground")}>
                              {isOverBudget ? `Over by $${Math.abs(remaining).toLocaleString()}` : `$${remaining.toLocaleString()} remaining`}
                            </span>
                            <span className="text-muted-foreground">{percentUsed}%</span>
                          </div>
                        </div>

                        {/* Sub-budget categories */}
                        {categories.length > 0 && (
                          <div className="mt-2 pt-2 border-t space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Sub-Budgets</p>
                            {categories.map(cat => {
                              const catSpent = cat.spent_amount || 0;
                              const catTotal = cat.allocated_amount || 1;
                              const catPercent = Math.min(Math.round((catSpent / catTotal) * 100), 100);
                              return (
                                <div key={cat.id} className="flex items-center gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-foreground font-medium truncate">{cat.name}</span>
                                      <span className="text-muted-foreground">${catSpent.toLocaleString()} / ${catTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-muted overflow-hidden mt-0.5">
                                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${catPercent}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Date range */}
                        <div className="mt-2 pt-2 border-t flex items-center gap-2 text-[10px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(budget.start_date), 'MMM d, yyyy')}
                          {budget.end_date && ` – ${format(new Date(budget.end_date), 'MMM d, yyyy')}`}
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => onNavigate('budgets')}>
                    Manage Budgets <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bus Company Section */}
      <Collapsible open={busOpen} onOpenChange={setBusOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bus className="h-4 w-4 text-primary" />
                  Bus Company
                  {busCompanies.length > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{busCompanies.length}</Badge>}
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", busOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              {busCompanies.length === 0 ? (
                <div className="text-center py-4">
                  <Bus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No bus company added yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Add your contracted bus company details</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {busCompanies.map(bus => (
                    <div key={bus.id} className="p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Bus className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{bus.company_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {bus.contact_name && (
                          <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-medium">Contact</p>
                            <p className="text-foreground">{bus.contact_name}</p>
                          </div>
                        )}
                        {bus.contact_phone && (
                          <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-medium">Phone</p>
                            <p className="text-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {bus.contact_phone}</p>
                          </div>
                        )}
                        {bus.driver_name ? (
                          <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-medium">Driver</p>
                            <p className="text-foreground">{bus.driver_name}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-medium">Driver</p>
                            <p className="text-muted-foreground italic">No driver info</p>
                          </div>
                        )}
                        {bus.driver_phone && (
                          <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-medium">Driver Phone</p>
                            <p className="text-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {bus.driver_phone}</p>
                          </div>
                        )}
                      </div>
                      {bus.contract_pdf_url && (
                        <div className="mt-2 pt-2 border-t">
                          <a
                            href={bus.contract_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> View Contract PDF
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>


      {/* Compact Stats Row */}
      <div className="hidden md:grid grid-cols-6 gap-2">
        {sections.map(section => <button key={section.id} onClick={() => onNavigate(section.id)} className="text-center p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="text-xl font-bold text-foreground">{section.stat}</div>
            <div className="text-[10px] capitalize text-slate-950">{section.statLabel}</div>
          </button>)}
      </div>

      {/* Two Column Layout: Route & Upcoming Dates - hidden on mobile */}
      <div className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tour Route Timeline */}
        
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
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {sections.map(section => <button key={section.id} onClick={() => onNavigate(section.id)} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left">
            <section.icon className={cn("h-5 w-5 mb-2", section.color.replace('bg-', 'text-'))} />
            <div className="text-sm font-medium">{section.title}</div>
            <div className="text-xs text-muted-foreground">{section.stat} {section.statLabel}</div>
          </button>)}
      </div>

      {/* Tour Stop Detail Dialog */}
      <TourStopDetailDialog
        stop={selectedStop}
        open={!!selectedStop}
        onOpenChange={(open) => !open && setSelectedStop(null)}
        onEdit={(stop) => { setSelectedStop(null); setEditingStop(stop); }}
        busCompanyName={busCompanies.find(b => b.id === selectedStop?.bus_company_id)?.company_name}
      />

      {/* Tour Stop Edit Form */}
      <TourStopEditForm
        stop={editingStop}
        open={!!editingStop}
        onOpenChange={(open) => !open && setEditingStop(null)}
        onSaved={() => {
          const fetchTourEvents = async () => {
            const { data } = await supabase.from('gw_tour_events').select('*').order('start_date', { ascending: false });
            if (data) setTourEvents(data as TourStopFull[]);
          };
          fetchTourEvents();
        }}
        busCompanies={busCompanies.map(b => ({ id: b.id, company_name: b.company_name }))}
      />
    </div>;
};