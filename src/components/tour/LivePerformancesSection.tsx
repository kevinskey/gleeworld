import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  Radio, 
  ExternalLink, 
  Calendar,
  MapPin,
  Play,
  Eye
} from "lucide-react";

interface LivePerformance {
  id: string;
  title: string;
  date: string;
  location: string;
  status: 'upcoming' | 'live' | 'recorded';
  viewCount?: number;
  streamUrl?: string;
  recordingUrl?: string;
  thumbnail?: string;
}

const livePerformances: LivePerformance[] = [
  {
    id: '1',
    title: 'Nashville - Fisk Memorial Chapel',
    date: 'March 15, 2026 • 7:00 PM EST',
    location: 'Nashville, TN',
    status: 'upcoming',
    streamUrl: '#',
  },
  {
    id: '2',
    title: 'St. Louis - Powell Symphony Hall',
    date: 'March 17, 2026 • 7:30 PM CST',
    location: 'St. Louis, MO',
    status: 'upcoming',
    streamUrl: '#',
  },
  {
    id: '3',
    title: 'Chicago - Symphony Center',
    date: 'March 18, 2026 • 8:00 PM CST',
    location: 'Chicago, IL',
    status: 'upcoming',
    streamUrl: '#',
  },
  {
    id: '4',
    title: '2025 Spring Tour - Atlanta Concert',
    date: 'April 20, 2025',
    location: 'Atlanta, GA',
    status: 'recorded',
    viewCount: 1234,
    recordingUrl: '#',
    thumbnail: '/placeholder.svg',
  },
];

const getStatusBadge = (status: LivePerformance['status']) => {
  switch (status) {
    case 'live':
      return <Badge className="bg-red-500 text-white animate-pulse"><Radio className="h-3 w-3 mr-1" />LIVE NOW</Badge>;
    case 'upcoming':
      return <Badge variant="outline" className="border-primary text-primary"><Calendar className="h-3 w-3 mr-1" />Upcoming</Badge>;
    case 'recorded':
      return <Badge variant="secondary"><Video className="h-3 w-3 mr-1" />Recording</Badge>;
    default:
      return null;
  }
};

export const LivePerformancesSection = () => {
  const upcomingPerformances = livePerformances.filter(p => p.status === 'upcoming' || p.status === 'live');
  const recordedPerformances = livePerformances.filter(p => p.status === 'recorded');

  return (
    <div className="space-y-8">
      {/* Live/Upcoming Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          Upcoming Livestreams
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          {upcomingPerformances.map((performance) => (
            <Card key={performance.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                <Video className="h-12 w-12 text-primary/40" />
                <div className="absolute top-3 right-3">
                  {getStatusBadge(performance.status)}
                </div>
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">{performance.title}</h4>
                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {performance.date}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {performance.location}
                  </p>
                </div>
                <Button className="w-full" disabled={performance.status === 'upcoming'}>
                  {performance.status === 'live' ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Watch Live
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Set Reminder
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Past Recordings Section */}
      {recordedPerformances.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Past Tour Recordings
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recordedPerformances.map((performance) => (
              <Card key={performance.id} className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {performance.thumbnail ? (
                    <img 
                      src={performance.thumbnail} 
                      alt={performance.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Video className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute top-2 left-2">
                    {getStatusBadge(performance.status)}
                  </div>
                </div>
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm mb-1 truncate">{performance.title}</h4>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{performance.date}</span>
                    {performance.viewCount && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {performance.viewCount.toLocaleString()} views
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* External Links */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-medium">Watch All Performances</p>
              <p className="text-sm text-muted-foreground">
                Subscribe to our YouTube channel for all tour content
              </p>
            </div>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit YouTube Channel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
