import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Eye, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Activity,
  Search,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface UserEngagement {
  user_id: string;
  date: string;
  page_views: number;
  session_count: number;
  modules_visited: string[];
  full_name?: string;
  email?: string;
}

interface PageView {
  id: string;
  user_id: string;
  page_path: string;
  page_title: string;
  module_id: string | null;
  device_type: string;
  browser: string;
  created_at: string;
  full_name?: string;
}

interface SessionData {
  id: string;
  user_id: string;
  session_start: string;
  session_end: string | null;
  page_count: number;
  device_type: string;
  is_active: boolean;
  full_name?: string;
}

export const UsageAnalyticsModule: React.FC = () => {
  const [engagementData, setEngagementData] = useState<UserEngagement[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState(7); // days
  const [stats, setStats] = useState({
    totalPageViews: 0,
    uniqueUsers: 0,
    activeSessions: 0,
    avgPagesPerSession: 0,
    topModules: [] as { module: string; count: number }[],
    deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = startOfDay(subDays(new Date(), dateRange)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      // Fetch page views with user info
      const { data: viewsData } = await supabase
        .from('user_page_views')
        .select(`
          id,
          user_id,
          page_path,
          page_title,
          module_id,
          device_type,
          browser,
          created_at
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(500);

      // Fetch user profiles for names
      const userIds = [...new Set(viewsData?.map(v => v.user_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const viewsWithNames = (viewsData || []).map(v => ({
        ...v,
        full_name: profileMap.get(v.user_id)?.full_name || 'Unknown User'
      }));

      setPageViews(viewsWithNames);

      // Fetch daily engagement
      const { data: engagementRaw } = await supabase
        .from('user_engagement_daily')
        .select('*')
        .gte('date', startDate.split('T')[0])
        .order('date', { ascending: false });

      const engagementWithNames = (engagementRaw || []).map(e => ({
        ...e,
        full_name: profileMap.get(e.user_id)?.full_name || 'Unknown User',
        email: profileMap.get(e.user_id)?.email
      }));

      setEngagementData(engagementWithNames);

      // Fetch active sessions
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('session_start', startDate)
        .order('session_start', { ascending: false })
        .limit(100);

      const sessionsWithNames = (sessionsData || []).map(s => ({
        ...s,
        full_name: profileMap.get(s.user_id)?.full_name || 'Unknown User'
      }));

      setSessions(sessionsWithNames);

      // Calculate stats
      const totalPageViews = viewsWithNames.length;
      const uniqueUsers = new Set(viewsWithNames.map(v => v.user_id)).size;
      const activeSessions = sessionsWithNames.filter(s => s.is_active).length;
      const avgPagesPerSession = sessionsWithNames.length > 0
        ? Math.round(sessionsWithNames.reduce((sum, s) => sum + (s.page_count || 0), 0) / sessionsWithNames.length)
        : 0;

      // Module usage
      const moduleCounts: Record<string, number> = {};
      viewsWithNames.forEach(v => {
        if (v.module_id) {
          moduleCounts[v.module_id] = (moduleCounts[v.module_id] || 0) + 1;
        }
      });
      const topModules = Object.entries(moduleCounts)
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Device breakdown
      const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
      viewsWithNames.forEach(v => {
        const dt = v.device_type?.toLowerCase() || 'desktop';
        if (dt in deviceBreakdown) {
          deviceBreakdown[dt as keyof typeof deviceBreakdown]++;
        }
      });

      setStats({
        totalPageViews,
        uniqueUsers,
        activeSessions,
        avgPagesPerSession,
        topModules,
        deviceBreakdown
      });

    } catch (err) {
      console.error('Failed to fetch usage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const filteredEngagement = engagementData.filter(e => 
    e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPageViews = pageViews.filter(v =>
    v.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.page_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.module_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const DeviceIcon = ({ type }: { type: string }) => {
    switch (type?.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Usage Analytics</h2>
          <p className="text-muted-foreground">Track how students are using the website</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 rounded-md border bg-background text-foreground"
          >
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPageViews}</p>
                <p className="text-sm text-muted-foreground">Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                <p className="text-sm text-muted-foreground">Unique Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeSessions}</p>
                <p className="text-sm text-muted-foreground">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgPagesPerSession}</p>
                <p className="text-sm text-muted-foreground">Avg Pages/Session</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Device Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{stats.deviceBreakdown.desktop}</span>
              <span className="text-sm text-muted-foreground">Desktop</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{stats.deviceBreakdown.mobile}</span>
              <span className="text-sm text-muted-foreground">Mobile</span>
            </div>
            <div className="flex items-center gap-2">
              <Tablet className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{stats.deviceBreakdown.tablet}</span>
              <span className="text-sm text-muted-foreground">Tablet</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, page, or module..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pageviews" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pageviews">Page Views</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="modules">Top Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="pageviews" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredPageViews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No page views found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPageViews.slice(0, 50).map((view) => (
                        <TableRow key={view.id}>
                          <TableCell className="font-medium">{view.full_name}</TableCell>
                          <TableCell>
                            <span className="text-sm">{view.page_title || view.page_path}</span>
                          </TableCell>
                          <TableCell>
                            {view.module_id && (
                              <Badge variant="secondary" className="text-xs">
                                {view.module_id}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DeviceIcon type={view.device_type} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(view.created_at), 'MMM d, h:mm a')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Page Views</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Modules Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredEngagement.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No engagement data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEngagement.slice(0, 50).map((eng) => (
                        <TableRow key={eng.user_id + eng.date}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{eng.full_name}</p>
                              <p className="text-xs text-muted-foreground">{eng.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(eng.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{eng.page_views}</Badge>
                          </TableCell>
                          <TableCell>{eng.session_count || 1}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(eng.modules_visited || []).slice(0, 3).map((m, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {m}
                                </Badge>
                              ))}
                              {(eng.modules_visited?.length || 0) > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{eng.modules_visited!.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Most Visited Modules</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topModules.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No module data yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.topModules.map((item, i) => (
                    <div key={item.module} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                        <span className="font-medium">{item.module}</span>
                      </div>
                      <Badge>{item.count} views</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
