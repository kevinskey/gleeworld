import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  QrCode, 
  TrendingUp, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface ScanStats {
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  unique_users: number;
  success_rate: number;
}

interface DailyStats {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export default function QRAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [topEvents, setTopEvents] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();
    
    const adminAccess = profile?.is_admin || profile?.is_super_admin || false;
    setIsAdmin(adminAccess);
    
    if (adminAccess) {
      await fetchAnalytics();
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch overall stats
      const { data: scanLogs } = await supabase
        .from('qr_scan_logs')
        .select('*');

      if (scanLogs) {
        const totalScans = scanLogs.length;
        const successfulScans = scanLogs.filter(log => log.scan_status === 'success').length;
        const failedScans = scanLogs.filter(log => log.scan_status === 'failed').length;
        const uniqueUsers = new Set(scanLogs.map(log => log.user_id).filter(Boolean)).size;
        const successRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0;

        setStats({
          total_scans: totalScans,
          successful_scans: successfulScans,
          failed_scans: failedScans,
          unique_users: uniqueUsers,
          success_rate: successRate
        });

        // Process daily stats for the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), i);
          return format(date, 'yyyy-MM-dd');
        }).reverse();

        const daily = last7Days.map(dateStr => {
          const dayLogs = scanLogs.filter(log => 
            format(new Date(log.scanned_at), 'yyyy-MM-dd') === dateStr
          );
          
          return {
            date: format(new Date(dateStr), 'MMM dd'),
            successful: dayLogs.filter(log => log.scan_status === 'success').length,
            failed: dayLogs.filter(log => log.scan_status !== 'success').length,
            total: dayLogs.length
          };
        });

        setDailyStats(daily);

        // Status breakdown
        const statusCounts = scanLogs.reduce((acc, log) => {
          acc[log.scan_status] = (acc[log.scan_status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const breakdown = Object.entries(statusCounts).map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count,
          percentage: (count / totalScans) * 100
        }));

        setStatusBreakdown(breakdown);
      }

      // Fetch top events with scan counts
      const { data: eventScans } = await supabase
        .from('qr_scan_logs')
        .select('event_id')
        .not('event_id', 'is', null);

      if (eventScans && eventScans.length > 0) {
        const eventIds = [...new Set(eventScans.map(scan => scan.event_id))];
        
        const { data: events } = await supabase
          .from('gw_events')
          .select('id, title')
          .in('id', eventIds);

        if (events) {
          const eventCounts = eventScans.reduce((acc, scan) => {
            const event = events.find(e => e.id === scan.event_id);
            const eventTitle = event?.title || 'Unknown Event';
            acc[eventTitle] = (acc[eventTitle] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const topEventsList = Object.entries(eventCounts)
            .map(([title, scans]) => ({ title, scans }))
            .sort((a, b) => b.scans - a.scans)
            .slice(0, 5);

          setTopEvents(topEventsList);
        }
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280'];

  if (!user) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view QR analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need administrator privileges to view QR analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <QrCode className="h-6 w-6" />
        <h1 className="text-3xl font-bold">QR Code Analytics</h1>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
            </div>
            <p className="text-2xl font-bold">{stats?.total_scans || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-muted-foreground">Successful</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats?.successful_scans || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <p className="text-sm font-medium text-muted-foreground">Unique Users</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats?.unique_users || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {stats?.success_rate?.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Scan Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Scan Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" stackId="a" fill="#22c55e" name="Successful" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Scan Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percentage }) => `${status} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Top Events by Scan Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topEvents.length > 0 ? (
            <div className="space-y-3">
              {topEvents.map((event, index) => (
                <div key={event.title} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <p className="font-medium">{event.title}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary">
                    {event.scans} scans
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">No event data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}