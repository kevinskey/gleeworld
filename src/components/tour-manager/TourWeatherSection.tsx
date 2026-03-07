import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CloudSun, Droplets, Wind, Thermometer, CloudRain, Sun, Cloud, Snowflake, CloudLightning, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface WeatherData {
  city: string;
  state: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  arrivalDate: string;
  departureDate: string;
}

const WEATHER_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'clear': Sun,
  'clouds': Cloud,
  'rain': CloudRain,
  'drizzle': CloudRain,
  'thunderstorm': CloudLightning,
  'snow': Snowflake,
  'mist': Cloud,
  'fog': Cloud,
  'haze': Cloud,
};

const getWeatherIcon = (description: string) => {
  const key = Object.keys(WEATHER_ICON_MAP).find(k => description.toLowerCase().includes(k));
  return key ? WEATHER_ICON_MAP[key] : CloudSun;
};

const getWeatherGradient = (description: string) => {
  const desc = description.toLowerCase();
  if (desc.includes('clear') || desc.includes('sun')) return 'from-amber-400/20 to-orange-400/10 border-amber-300/30';
  if (desc.includes('cloud')) return 'from-slate-400/20 to-gray-400/10 border-slate-300/30';
  if (desc.includes('rain') || desc.includes('drizzle')) return 'from-blue-400/20 to-indigo-400/10 border-blue-300/30';
  if (desc.includes('snow')) return 'from-cyan-200/20 to-blue-200/10 border-cyan-200/30';
  if (desc.includes('thunder')) return 'from-purple-400/20 to-violet-400/10 border-purple-300/30';
  return 'from-sky-400/20 to-blue-400/10 border-sky-300/30';
};

// State name to code mapping
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC',
};

const normalizeState = (state: string): string => {
  if (!state) return '';
  if (state.length === 2) return state;
  return STATE_NAME_TO_CODE[state] || state;
};

export const TourWeatherSection: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTourWeather = async () => {
    setLoading(true);
    try {
      // Find the active tour
      const { data: tours, error: toursError } = await supabase
        .from('gw_tours')
        .select('id, name, status')
        .in('status', ['active', 'confirmed', 'planning'])
        .order('start_date', { ascending: true })
        .limit(10);

      if (toursError) {
        console.error('Weather: Tours query error:', toursError.message);
      }

      const activeTour = tours?.find(t => t.status === 'active')
        || tours?.find(t => t.status === 'confirmed')
        || tours?.[0];

      if (!activeTour) {
        console.warn('Weather: No active tour found');
        setWeatherData([]);
        setLoading(false);
        return;
      }

      console.log(`Weather: Loading cities for "${activeTour.name}" (${activeTour.status})`);

      // Get tour cities with coordinates
      const { data: cities, error: citiesError } = await supabase
        .from('gw_tour_cities')
        .select('city_name, state_code, arrival_date, departure_date, latitude, longitude, city_order')
        .eq('tour_id', activeTour.id)
        .order('city_order', { ascending: true });

      if (citiesError || !cities || cities.length === 0) {
        console.warn('Weather: No cities found', citiesError?.message);
        setWeatherData([]);
        setLoading(false);
        return;
      }

      console.log(`Weather: Found ${cities.length} cities, calling Edge Function...`);

      // Build payload for edge function
      const citiesPayload = cities
        .filter(c => c.latitude && c.longitude)
        .map(c => ({
          lat: Number(c.latitude),
          lon: Number(c.longitude),
          name: c.city_name,
          state: normalizeState(c.state_code || ''),
          arrivalDate: c.arrival_date || '',
          departureDate: c.departure_date || '',
        }));

      if (citiesPayload.length === 0) {
        console.warn('Weather: No cities have coordinates');
        setWeatherData([]);
        setLoading(false);
        return;
      }

      // Call Edge Function to fetch weather server-side
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { cities: citiesPayload },
      });

      if (error) {
        console.error('Weather: Edge Function error:', error);
        setWeatherData([]);
        setLoading(false);
        return;
      }

      const results = (data?.weather || []) as WeatherData[];
      console.log(`Weather: Got ${results.length} results from Edge Function`);
      setWeatherData(results);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching tour weather:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await fetchTourWeather();
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Tour City Weather</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-12 w-20 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (weatherData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CloudSun className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg text-foreground">No Tour Cities Found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Add cities to your tour itinerary to see weather forecasts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">Tour City Weather</h2>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchTourWeather()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {weatherData.map((w, idx) => {
          const WeatherIcon = getWeatherIcon(w.description);
          const gradient = getWeatherGradient(w.description);

          return (
            <Card key={idx} className={`bg-gradient-to-br ${gradient} border overflow-hidden`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-1.5 text-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    {w.city}{w.state ? `, ${w.state}` : ''}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    Stop {idx + 1}
                  </Badge>
                </div>
                {w.arrivalDate && (
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(w.arrivalDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {w.departureDate && ` – ${new Date(w.departureDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <WeatherIcon className="h-10 w-10 text-primary" />
                    <div>
                      <span className="text-3xl font-bold text-foreground">{w.temp}°</span>
                      <span className="text-sm text-muted-foreground ml-1">F</span>
                    </div>
                  </div>
                  <span className="text-sm capitalize text-muted-foreground">{w.description}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Thermometer className="h-3.5 w-3.5" />
                    <span>Feels {w.feelsLike}°</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Droplets className="h-3.5 w-3.5" />
                    <span>{w.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Wind className="h-3.5 w-3.5" />
                    <span>{w.windSpeed} mph</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
