import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  GraduationCap, 
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
  RefreshCw,
  Heart,
  Award,
  BookOpen,
  MapPin,
  DollarSign,
  Network,
  Camera
} from 'lucide-react';

interface AlumnaeEvent {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  event_type: string;
  [key: string]: any; // Allow additional fields from database
}

interface AlumnaeProfile {
  id: string;
  full_name: string;
  class_year: number | null;
  graduation_year: number | null;
  current_city?: string;
  workplace?: string;
  mentor_opt_in: boolean | null;
}

interface MemoryWallItem {
  id: string;
  title: string;
  content_type: string;
  class_year?: number;
  created_at: string;
  is_featured: boolean;
}

interface AlumnaeDashboardData {
  reunionEvents: AlumnaeEvent[];
  alumnaeProfiles: AlumnaeProfile[];
  memoryWall: MemoryWallItem[];
  mentorships: any[];
  announcements: any[];
  classUpdates: any[];
}

interface AlumnaeAnalytics {
  totalAlumnae: number;
  activeMentors: number;
  upcomingReunions: number;
  recentMemories: number;
}

export const AlumnaeDashboardMonitor = () => {
  const [dashboardData, setDashboardData] = useState<AlumnaeDashboardData>({
    reunionEvents: [],
    alumnaeProfiles: [],
    memoryWall: [],
    mentorships: [],
    announcements: [],
    classUpdates: []
  });
  const [analytics, setAnalytics] = useState<AlumnaeAnalytics>({
    totalAlumnae: 0,
    activeMentors: 0,
    upcomingReunions: 0,
    recentMemories: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAlumnaeDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch alumnae profiles
      const { data: alumnaeProfiles, count: alumnaeCount } = await supabase
        .from('gw_profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'alumna')
        .order('graduation_year', { ascending: false })
        .limit(20);

      // Fetch mentor count
      const { count: mentorCount } = await supabase
        .from('gw_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'alumna')
        .eq('mentor_opt_in', true);

      // Fetch reunion/alumnae events
      const { data: events } = await supabase
        .from('gw_events')
        .select('*')
        .or('event_type.eq.reunion,event_type.eq.alumni')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(10);

      // Fetch announcements for alumnae
      const { data: announcements } = await supabase
        .from('gw_announcements')
        .select('*')
        .or('target_audience.eq.alumnae,target_audience.eq.all')
        .order('created_at', { ascending: false })
        .limit(5);

      setDashboardData({
        reunionEvents: events || [],
        alumnaeProfiles: alumnaeProfiles || [],
        memoryWall: [],
        mentorships: [],
        announcements: announcements || [],
        classUpdates: []
      });

      setAnalytics({
        totalAlumnae: alumnaeCount || 0,
        activeMentors: mentorCount || 0,
        upcomingReunions: events?.filter(e => e.event_type === 'reunion').length || 0,
        recentMemories: 0
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching alumnae dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumnaeDashboardData();
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

  const getClassYearBadge = (year: number | null) => {
    if (!year) return null;
    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - year;
    return (
      <Badge variant="outline" className="text-xs">
        Class of '{year.toString().slice(-2)} ({yearsAgo} years)
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <GraduationCap className="h-8 w-8" />
            Alumnae Dashboard Monitor
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage what alumnae see on their dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button 
            onClick={fetchAlumnaeDashboardData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <a href="/alumnae" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              View Alumnae Page
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
              <GraduationCap className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Alumnae</p>
                <p className="text-2xl font-bold">{analytics.totalAlumnae}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Mentors</p>
                <p className="text-2xl font-bold">{analytics.activeMentors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Reunions</p>
                <p className="text-2xl font-bold">{analytics.upcomingReunions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Camera className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Recent Memories</p>
                <p className="text-2xl font-bold">{analytics.recentMemories}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Content Tabs */}
      <Tabs defaultValue="reunions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="reunions">Reunions</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="mentorship">Mentorship</TabsTrigger>
          <TabsTrigger value="memories">Memory Wall</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="reunions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Reunion Events & Alumni Gatherings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.reunionEvents.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.reunionEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant="outline">{event.event_type}</Badge>
                          {event.event_type === 'reunion' && (
                            <Badge variant="secondary">
                              Reunion Event
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.start_date)} • {event.location || 'Location TBD'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming reunion events</p>
                  <Button className="mt-4" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Plan Reunion Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Alumnae Directory & Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.alumnaeProfiles.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.alumnaeProfiles.slice(0, 10).map((alumna) => (
                    <div key={alumna.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium">{alumna.full_name}</h4>
                          {getClassYearBadge(alumna.graduation_year || alumna.class_year)}
                          {alumna.mentor_opt_in && (
                            <Badge variant="secondary">
                              <Heart className="h-3 w-3 mr-1" />
                              Mentor
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alumna.workplace && `${alumna.workplace} • `}
                          {alumna.current_city || 'Location not specified'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-center pt-4">
                    <Button variant="outline">
                      View All {analytics.totalAlumnae} Alumnae
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No alumnae profiles found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mentorship" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Mentorship Program
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Heart className="h-6 w-6 text-red-500" />
                      <div>
                        <h4 className="font-medium">Available Mentors</h4>
                        <p className="text-2xl font-bold text-primary">{analytics.activeMentors}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Alumnae offering mentorship to current students
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="h-6 w-6 text-blue-500" />
                      <div>
                        <h4 className="font-medium">Active Connections</h4>
                        <p className="text-2xl font-bold text-primary">0</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current mentor-student relationships
                    </p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Mentorship Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Career guidance and professional development</li>
                    <li>• Industry connections and networking</li>
                    <li>• Performance and audition preparation</li>
                    <li>• Academic and life advice</li>
                  </ul>
                  <Button className="mt-3" variant="outline" size="sm">
                    Manage Mentorship Program
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Memory Wall & Archives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Memory Wall coming soon!</p>
                <p className="text-sm mb-4">
                  A place for alumnae to share photos, stories, and memories from their time in Glee Club
                </p>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Set Up Memory Wall
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Alumnae Updates & Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.announcements.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.announcements.map((announcement) => (
                    <div key={announcement.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{announcement.title}</h4>
                        <Badge variant="outline">{announcement.target_audience}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {announcement.content?.substring(0, 150)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Published: {formatDate(announcement.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent announcements for alumnae</p>
                  <Button className="mt-4" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Create Alumnae Announcement
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};