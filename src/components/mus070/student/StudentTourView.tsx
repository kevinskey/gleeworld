import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { MapPin, Calendar, Clock, Hotel, Music, Bus, Utensils, Users, ChevronRight, Plane } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

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

const eventTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  performance: { icon: Music, color: 'bg-primary text-primary-foreground', label: 'Performance' },
  travel: { icon: Bus, color: 'bg-muted text-foreground/70', label: 'Travel Day' },
  free: { icon: Calendar, color: 'bg-accent text-accent-foreground', label: 'Free Day' },
  rehearsal: { icon: Music, color: 'bg-secondary text-secondary-foreground', label: 'Rehearsal' },
};

export const StudentTourView: React.FC = () => {
  const { user } = useAuth();

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

  return (
    <div className="space-y-6">
      {/* Tour Header */}
      <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.8)] rounded-xl p-6 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{tour.name}</h2>
            <p className="text-primary-foreground/80 mt-1">
              {format(new Date(tour.start_date), 'MMMM d')} – {format(new Date(tour.end_date), 'MMMM d, yyyy')}
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
      </div>

      {/* Tour Itinerary */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Itinerary
        </h3>

        <div className="space-y-3">
          {cities.map((city, idx) => {
            const cityLogistics = getLogisticsForCity(city.id);
            const cityEvents = getEventsForCity(city);
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
                          {format(new Date(city.arrival_date + 'T12:00:00'), 'EEEE, MMMM d')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 space-y-3">
                  {/* Events for this city */}
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
                            {format(new Date(event.start_date), 'h:mm a')} – {format(new Date(event.end_date), 'h:mm a')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{cfg.label}</Badge>
                      </div>
                    );
                  })}

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
                  {cityEvents.length === 0 && !cityLogistics && city.city_notes && (
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
