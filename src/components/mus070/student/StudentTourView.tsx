import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, Clock, Hotel, Music, Bus, Utensils, Users, ChevronRight, Plane, FileSignature, CheckCircle2, ListChecks, AlertCircle, UserCheck } from 'lucide-react';
import { format, differenceInDays, isValid, parseISO } from 'date-fns';
import { TourContractSigningModal } from './TourContractSigningModal';

const safeFormat = (dateStr: string | null | undefined, fmt: string, fallback = '—') => {
  if (!dateStr) return fallback;
  try {
    const d = typeof dateStr === 'string' && !dateStr.includes('T') ? new Date(dateStr + 'T12:00:00') : new Date(dateStr);
    return isValid(d) ? format(d, fmt) : fallback;
  } catch { return fallback; }
};

interface TourCity {
  id: string;
  city_name: string;
  state_code: string;
  arrival_date: string;
  departure_date: string | null;
  city_notes: string;
  city_order: number;
}

interface TourEvent {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  event_type: string;
  venue_name: string | null;
  venue_address: string | null;
  host_name: string | null;
  host_location: string | null;
}

interface TourLogistics {
  id: string;
  tour_city_id: string;
  lodging_name: string | null;
  lodging_address: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  rehearsal_time: string | null;
  show_time: string | null;
  meal_arrangements: string | null;
  transport_notes: string | null;
  hospitality_notes: string | null;
}

interface TimelineEvent {
  id: string;
  label: string;
  description: string | null;
  event_category: string;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string | null;
  notes: string | null;
}

const eventTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  performance: { icon: Music, color: 'bg-primary text-primary-foreground', label: 'Performance' },
  travel: { icon: Bus, color: 'bg-muted text-foreground/70', label: 'Travel Day' },
  free: { icon: Calendar, color: 'bg-accent text-accent-foreground', label: 'Free Day' },
  rehearsal: { icon: Music, color: 'bg-secondary text-secondary-foreground', label: 'Rehearsal' },
};

const timelineCategoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  call_time: { icon: AlertCircle, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', label: 'Call Time' },
  transport: { icon: Bus, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Transport' },
  performance: { icon: Music, color: 'bg-primary/10 text-primary', label: 'Performance' },
  rehearsal: { icon: Music, color: 'bg-secondary text-secondary-foreground', label: 'Rehearsal' },
  meal: { icon: Utensils, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Meal' },
  lodging: { icon: Hotel, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', label: 'Lodging' },
  free_time: { icon: Calendar, color: 'bg-muted text-foreground/70', label: 'Free Time' },
};

const formatTime12 = (time: string | null) => {
  if (!time) return null;
  try {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return time; }
};

export const StudentTourView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [contractOpen, setContractOpen] = useState(false);

  // Check if student already signed the tour contract
  const { data: hasSigned } = useQuery({
    queryKey: ['tour-contract-signature', user?.id, '99ad60d3-0e94-41b2-b4f9-1b03146c62c9'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tour_contract_signatures')
        .select('id')
        .eq('contract_id', '99ad60d3-0e94-41b2-b4f9-1b03146c62c9')
        .eq('user_id', user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Fetch active/upcoming tour
  const { data: tour, isLoading: tourLoading } = useQuery({
    queryKey: ['student-tour-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tours')
        .select('*')
        .in('status', ['planning', 'confirmed', 'active'])
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch tour cities
  const { data: cities = [] } = useQuery({
    queryKey: ['student-tour-cities', tour?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tour_cities')
        .select('*')
        .eq('tour_id', tour!.id)
        .order('city_order', { ascending: true });
      if (error) throw error;
      return data as TourCity[];
    },
    enabled: !!tour?.id,
  });

  // Fetch tour events
  const { data: events = [] } = useQuery({
    queryKey: ['student-tour-events', tour?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tour_events')
        .select('*')
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as TourEvent[];
    },
    enabled: !!tour?.id,
  });

  // Fetch logistics for all cities
  const { data: logistics = [] } = useQuery({
    queryKey: ['student-tour-logistics', cities.map(c => c.id)],
    queryFn: async () => {
      const cityIds = cities.map(c => c.id);
      if (cityIds.length === 0) return [];
      const { data, error } = await supabase
        .from('gw_tour_logistics')
        .select('*')
        .in('tour_city_id', cityIds);
      if (error) throw error;
      return data as TourLogistics[];
    },
    enabled: cities.length > 0,
  });

  // Fetch timeline events from logistics
  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['student-tour-timeline', tour?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tour_timeline_events')
        .select('id, label, description, event_category, event_date, event_time, end_time, location, status, notes')
        .eq('tour_id', tour!.id)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
      if (error) throw error;
      return data as TimelineEvent[];
    },
    enabled: !!tour?.id,
  });

  // Fetch active roll call sessions
  const { data: activeCheckin } = useQuery({
    queryKey: ['student-active-checkin', tour?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_checkins')
        .select('id, title, opened_at')
        .eq('tour_id', tour!.id)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!tour?.id,
    refetchInterval: 10000,
  });

  // Check if user already responded
  const { data: myResponse } = useQuery({
    queryKey: ['student-checkin-response', activeCheckin?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_checkin_responses')
        .select('id, checked_in_at')
        .eq('checkin_id', activeCheckin!.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!activeCheckin?.id && !!user?.id,
    refetchInterval: 10000,
  });

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gw_tour_checkin_responses').insert({
        checkin_id: activeCheckin!.id,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-checkin-response'] });
      toast({ title: '✓ Checked In', description: 'Your presence has been recorded.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (tourLoading) {
    return <LoadingSpinner size="lg" text="Loading tour info..." />;
  }

  if (!tour) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Plane className="h-12 w-12 text-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Upcoming Tour</h3>
        <p className="text-sm text-foreground/60">Tour information will appear here when a tour is scheduled.</p>
      </div>
    );
  }

  const daysUntilTour = differenceInDays(new Date(tour.start_date), new Date());
  const tourDuration = differenceInDays(new Date(tour.end_date), new Date(tour.start_date)) + 1;

  const getLogisticsForCity = (cityId: string) => logistics.find(l => l.tour_city_id === cityId);

  // Match events to cities by date proximity
  const getEventsForCity = (city: TourCity) => {
    return events.filter(e => {
      const eventDate = new Date(e.start_date).toISOString().split('T')[0];
      return eventDate === city.arrival_date;
    });
  };

  // Match timeline events to cities by date
  const getTimelineForCity = (city: TourCity) => {
    // Get all dates this city covers (arrival to departure)
    const dates: string[] = [];
    const start = new Date(city.arrival_date + 'T12:00:00');
    const end = city.departure_date ? new Date(city.departure_date + 'T12:00:00') : start;
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return timelineEvents.filter(te => dates.includes(te.event_date));
  };

  return (
    <div className="space-y-6">
      {/* Tour Header */}
      <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.8)] rounded-xl p-6 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{tour.name}</h2>
            <p className="text-primary-foreground/80 mt-1">
              {safeFormat(tour.start_date, 'MMMM d')} – {safeFormat(tour.end_date, 'MMMM d, yyyy')}
            </p>
          </div>
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-sm">
            {tour.status === 'confirmed' ? 'Confirmed' : tour.status === 'active' ? 'In Progress' : 'Planning'}
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{daysUntilTour > 0 ? daysUntilTour : 0}</p>
            <p className="text-xs text-primary-foreground/70">{daysUntilTour > 0 ? 'Days Until Tour' : 'Tour Started'}</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{cities.length}</p>
            <p className="text-xs text-primary-foreground/70">Cities</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{tourDuration}</p>
            <p className="text-xs text-primary-foreground/70">Days</p>
          </div>
        </div>

        {/* Contract Signing Button */}
        <div className="mt-5">
          {hasSigned ? (
            <div className="flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-primary-foreground font-medium">Thank You for Signing Your Tour Contract ✓</span>
            </div>
          ) : (
            <Button
              onClick={() => setContractOpen(true)}
              className="w-full gap-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0"
              variant="outline"
            >
              <FileSignature className="h-4 w-4" />
              Sign Tour Participation Contract
            </Button>
          )}
        </div>
      </div>

      <TourContractSigningModal open={contractOpen} onOpenChange={setContractOpen} />

      {/* Roll Call - I Am Here */}
      {activeCheckin && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  {activeCheckin.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Roll call is active — confirm your presence</p>
              </div>
              {myResponse ? (
                <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="text-right">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-300">Present</p>
                    <p className="text-[10px] text-green-600/70 dark:text-green-400/70">
                      {format(new Date(myResponse.checked_in_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="gap-2 bg-primary text-primary-foreground font-bold px-6"
                  onClick={() => checkinMutation.mutate()}
                  disabled={checkinMutation.isPending}
                >
                  <UserCheck className="h-4 w-4" />
                  I Am Here
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Itinerary
        </h3>

        <div className="space-y-3">
          {cities.map((city, idx) => {
            const cityLogistics = getLogisticsForCity(city.id);
            const cityEvents = getEventsForCity(city);
            const cityTimeline = getTimelineForCity(city);
            const isLast = idx === cities.length - 1;

            return (
              <Card key={city.id} className="overflow-hidden border-border">
                {/* City Header */}
                <CardHeader className="pb-2 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {city.city_order}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {city.city_name}, {city.state_code}
                        </CardTitle>
                        <p className="text-xs text-foreground/70">
                          {safeFormat(city.arrival_date, 'EEEE, MMMM d')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 space-y-3">
                  {/* Tour Events (from gw_tour_events) */}
                  {cityEvents.map(event => {
                    const cfg = eventTypeConfig[event.event_type] || eventTypeConfig.performance;
                    const Icon = cfg.icon;
                    return (
                      <div key={event.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-md ${cfg.color} flex-shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{event.title}</p>
                          {event.host_name && (
                            <p className="text-xs text-foreground/70 mt-0.5">Host: {event.host_name}</p>
                          )}
                          {event.location && (
                            <p className="text-xs text-foreground/70 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </p>
                          )}
                          <p className="text-xs text-foreground/70 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {safeFormat(event.start_date, 'h:mm a')} – {safeFormat(event.end_date, 'h:mm a')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{cfg.label}</Badge>
                      </div>
                    );
                  })}

                  {/* Timeline Events (from logistics) */}
                  {cityTimeline.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider pt-1">
                        <ListChecks className="h-3.5 w-3.5" />
                        <span>Day Schedule</span>
                      </div>
                      {cityTimeline.map(te => {
                        const cfg = timelineCategoryConfig[te.event_category] || timelineCategoryConfig.call_time;
                        const Icon = cfg.icon;
                        return (
                          <div key={te.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-md ${cfg.color} flex-shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground">{te.label}</p>
                              {(te.event_time || te.end_time) && (
                                <p className="text-xs text-foreground/70 flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {formatTime12(te.event_time)}
                                  {te.end_time && ` – ${formatTime12(te.end_time)}`}
                                </p>
                              )}
                              {te.location && (
                                <p className="text-xs text-foreground/70 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {te.location}
                                </p>
                              )}
                              {te.description && (
                                <p className="text-xs text-foreground/70 mt-1.5 whitespace-pre-line leading-relaxed">
                                  {te.description}
                                </p>
                              )}
                              {te.notes && (
                                <p className="text-xs text-foreground/50 mt-1 italic">{te.notes}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">{cfg.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Logistics Details */}
                  {cityLogistics && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {cityLogistics.lodging_name && (
                        <div className="flex items-start gap-2 text-sm">
                          <Hotel className="h-4 w-4 text-foreground/60 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{cityLogistics.lodging_name}</p>
                            {cityLogistics.lodging_address && (
                              <p className="text-xs text-foreground/60">{cityLogistics.lodging_address}</p>
                            )}
                            {(cityLogistics.check_in_time || cityLogistics.check_out_time) && (
                              <p className="text-xs text-foreground/60">
                                {cityLogistics.check_in_time && `Check-in: ${cityLogistics.check_in_time}`}
                                {cityLogistics.check_in_time && cityLogistics.check_out_time && ' • '}
                                {cityLogistics.check_out_time && `Check-out: ${cityLogistics.check_out_time}`}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {cityLogistics.meal_arrangements && (
                        <div className="flex items-start gap-2 text-sm">
                          <Utensils className="h-4 w-4 text-foreground/60 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Meals</p>
                            <p className="text-xs text-foreground/60">{cityLogistics.meal_arrangements}</p>
                          </div>
                        </div>
                      )}

                      {cityLogistics.transport_notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <Bus className="h-4 w-4 text-foreground/60 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Transportation</p>
                            <p className="text-xs text-foreground/60">{cityLogistics.transport_notes}</p>
                          </div>
                        </div>
                      )}

                      {cityLogistics.hospitality_notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <Users className="h-4 w-4 text-foreground/60 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Hospitality</p>
                            <p className="text-xs text-foreground/60">{cityLogistics.hospitality_notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* No details fallback */}
                  {cityEvents.length === 0 && cityTimeline.length === 0 && !cityLogistics && city.city_notes && (
                    <p className="text-sm text-foreground/60 italic">{city.city_notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
