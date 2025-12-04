import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Music } from "lucide-react";

interface TourStop {
  id: string;
  date: string;
  city: string;
  venue: string;
  time: string;
  type: 'performance' | 'rehearsal' | 'travel' | 'free';
}

const tourStops: TourStop[] = [
  { id: '1', date: '2026-03-15', city: 'Atlanta, GA', venue: 'Departure from Spelman', time: '6:00 AM', type: 'travel' },
  { id: '2', date: '2026-03-15', city: 'Nashville, TN', venue: 'Fisk Memorial Chapel', time: '7:00 PM', type: 'performance' },
  { id: '3', date: '2026-03-16', city: 'Nashville, TN', venue: 'Community Outreach', time: '10:00 AM', type: 'rehearsal' },
  { id: '4', date: '2026-03-17', city: 'St. Louis, MO', venue: 'Powell Symphony Hall', time: '7:30 PM', type: 'performance' },
  { id: '5', date: '2026-03-18', city: 'Chicago, IL', venue: 'Symphony Center', time: '8:00 PM', type: 'performance' },
  { id: '6', date: '2026-03-19', city: 'Chicago, IL', venue: 'Free Day - Sightseeing', time: 'All Day', type: 'free' },
  { id: '7', date: '2026-03-20', city: 'Detroit, MI', venue: 'Orchestra Hall', time: '7:00 PM', type: 'performance' },
];

const getTypeColor = (type: TourStop['type']) => {
  switch (type) {
    case 'performance': return 'bg-primary text-primary-foreground';
    case 'rehearsal': return 'bg-amber-500 text-white';
    case 'travel': return 'bg-blue-500 text-white';
    case 'free': return 'bg-emerald-500 text-white';
    default: return 'bg-muted';
  }
};

const getTypeLabel = (type: TourStop['type']) => {
  switch (type) {
    case 'performance': return 'Performance';
    case 'rehearsal': return 'Rehearsal';
    case 'travel': return 'Travel';
    case 'free': return 'Free Day';
    default: return type;
  }
};

export const TourDatesSection = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Performance
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          Rehearsal
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Travel
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Free Day
        </Badge>
      </div>

      <div className="space-y-4">
        {tourStops.map((stop) => (
          <Card key={stop.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex">
              <div className={`w-2 ${getTypeColor(stop.type)}`} />
              <div className="flex-1 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(stop.type)}>
                        {getTypeLabel(stop.type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(stop.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{stop.venue}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {stop.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {stop.time}
                      </span>
                    </div>
                  </div>
                  {stop.type === 'performance' && (
                    <div className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-primary">Concert</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
