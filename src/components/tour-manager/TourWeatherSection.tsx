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

// Geocode city name to lat/lon using Open-Meteo geocoding (free, no API key)
const geocodeCity = async (city: string, state: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const query = `${city}, ${state}, US`;
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
    // Fallback: try just city name
    const res2 = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const data2 = await res2.json();
    if (data2.results && data2.results.length > 0) {
      return { lat: data2.results[0].latitude, lon: data2.results[0].longitude };
    }
    return null;
  } catch {
    return null;
  }
};

// Fetch weather from Open-Meteo (free, no API key)
const fetchWeather = async (lat: number, lon: number): Promise<{
  temp: number; feelsLike: number; humidity: number; windSpeed: number; description: string; icon: string;
} | null> => {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
    );
    const data = await res.json();
    const current = data.current;
    const weatherCode = current.weather_code;
    
    // Map WMO weather codes to descriptions
    const desc = wmoCodeToDescription(weatherCode);
    
    return {
      temp: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      description: desc,
      icon: desc.toLowerCase(),
    };
  } catch {
    return null;
  }
};

const wmoCodeToDescription = (code: number): string => {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Clouds';
  if (code <= 49) return 'Fog';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Clear';
};

export const TourWeatherSection: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTourWeather = async () => {
    setLoading(true);
    try {
      // Fetch tour cities from itinerary
      const { data: cities } = await supabase
        .from('gw_tour_itinerary')
        .select('city_name, state, arrival_date, departure_date')
        .order('city_order', { ascending: true });

      if (!cities || cities.length === 0) {
        setWeatherData([]);
        setLoading(false);
        return;
      }

      const results: WeatherData[] = [];

      for (const city of cities) {
        const coords = await geocodeCity(city.city_name, city.state || '');
        if (!coords) continue;

        const weather = await fetchWeather(coords.lat, coords.lon);
        if (!weather) continue;

        results.push({
          city: city.city_name,
          state: city.state || '',
          temp: weather.temp,
          feelsLike: weather.feelsLike,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          description: weather.description,
          icon: weather.icon,
          arrivalDate: city.arrival_date || '',
          departureDate: city.departure_date || '',
        });
      }

      setWeatherData(results);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching tour weather:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTourWeather();
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
        <Button variant="outline" size="sm" onClick={fetchTourWeather} disabled={loading}>
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
