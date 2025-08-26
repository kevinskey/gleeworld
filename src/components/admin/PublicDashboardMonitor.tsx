import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Monitor, 
  Eye, 
  Settings, 
  Users, 
  Activity, 
  Globe,
  Calendar,
  Music,
  Image,
  TrendingUp,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface HeroSlide {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean | null;
  display_order: number | null;
  slide_duration_seconds: number | null;
  action_button_enabled: boolean | null;
  action_button_text: string | null;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  event_type: string;
  is_public: boolean;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  view_count: number;
  published_at: string;
  is_featured: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  [key: string]: any; // Allow additional fields
}

interface PublicDashboardData {
  heroSlides: HeroSlide[];
  events: Event[];
  albums: any[];
  videos: Video[];
  announcements: Announcement[];
  recentActivity: any[];
}

interface Analytics {
  totalVisitors: number;
  dailyVisitors: number;
  popularSections: string[];
  avgTimeOnPage: number;
}

export const PublicDashboardMonitor = () => {
  const [dashboardData, setDashboardData] = useState<PublicDashboardData>({
    heroSlides: [],
    events: [],
    albums: [],
    videos: [],
    announcements: [],
    recentActivity: []
  });
  const [analytics, setAnalytics] = useState<Analytics>({
    totalVisitors: 0,
    dailyVisitors: 0,
    popularSections: [],
    avgTimeOnPage: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch hero slides
      const { data: heroSlides } = await supabase
        .from('gw_hero_slides')
        .select('*')
        .eq('usage_context', 'homepage')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      // Fetch public events
      const { data: events } = await supabase
        .from('gw_events')
        .select('*')
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(6);

      // Fetch YouTube videos
      const { data: videos } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(6);

      // Fetch announcements - Using any since the schema fields don't match exactly
      const { data: announcements } = await supabase
        .from('gw_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setDashboardData({
        heroSlides: heroSlides || [],
        events: events || [],
        albums: [], // Will be populated from music hook
        videos: videos || [],
        announcements: announcements || [],
        recentActivity: []
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Monitor className="h-8 w-8" />
            Public Dashboard Monitor
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage what visitors see on the public dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button 
            onClick={fetchDashboardData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <a href="/dashboard/public" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              View Public
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Image className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hero Slides</p>
                <p className="text-2xl font-bold">{dashboardData.heroSlides.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Public Events</p>
                <p className="text-2xl font-bold">{dashboardData.events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Music className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Featured Videos</p>
                <p className="text-2xl font-bold">{dashboardData.videos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Announcements</p>
                <p className="text-2xl font-bold">{dashboardData.announcements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Content Tabs */}
      <Tabs defaultValue="hero" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Hero Slides Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.heroSlides.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.heroSlides.map((slide, index) => (
                    <div key={slide.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline">Slide {index + 1}</Badge>
                          {getStatusBadge(slide.is_active || false)}
                          <span className="text-sm text-muted-foreground">
                            Duration: {slide.slide_duration_seconds || 10}s
                          </span>
                        </div>
                        <h4 className="font-medium">{slide.title || 'Untitled Slide'}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {slide.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {slide.action_button_enabled && (
                          <Badge variant="secondary">Has Button</Badge>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hero slides configured</p>
                  <Button className="mt-4" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Hero Slides
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Public Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.events.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.start_date)} • {event.location || 'Location TBD'}
                        </p>
                      </div>
                      <Badge variant="outline">{event.event_type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming public events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Featured Media Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.videos.map((video) => (
                    <div key={video.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-16 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{video.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {video.view_count.toLocaleString()} views
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(video.published_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No featured videos available</p>
                  <p className="text-sm mt-2">Sync your YouTube channel to display videos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.announcements.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.announcements.map((announcement) => (
                    <div key={announcement.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{announcement.title}</h4>
                        <Badge variant="secondary">Published</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {announcement.content?.substring(0, 150)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {formatDate(announcement.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No public announcements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};