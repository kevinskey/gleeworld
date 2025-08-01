import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export const TourOverview = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    confirmedPerformances: 0,
    completedPerformances: 0,
    totalRevenue: 0,
    upcomingPerformances: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingPerformances, setUpcomingPerformances] = useState<any[]>([]);

  useEffect(() => {
    const fetchTourData = async () => {
      try {
        // Fetch contract statistics
        const { data: contracts } = await supabase
          .from('contracts_v2')
          .select('status, title, created_at, stipend_amount');
        
        if (contracts) {
          const total = contracts.length;
          const pending = contracts.filter(c => c.status === 'pending_signatures').length;
          const confirmed = contracts.filter(c => c.status === 'signed').length;
          const completed = contracts.filter(c => c.status === 'completed').length;
          const totalRevenue = contracts
            .filter(c => c.status === 'completed' && c.stipend_amount)
            .reduce((sum, c) => sum + Number(c.stipend_amount), 0);
          
          setStats({
            totalRequests: total,
            pendingRequests: pending,
            confirmedPerformances: confirmed,
            completedPerformances: completed,
            totalRevenue,
            upcomingPerformances: confirmed
          });
          
          // Set recent activity from contracts
          const recent = contracts
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 3)
            .map((contract, index) => ({
              id: index + 1,
              type: contract.status === 'signed' ? 'confirmed' : 
                    contract.status === 'completed' ? 'payment' : 'request',
              title: contract.title,
              date: new Date(contract.created_at).toISOString().split('T')[0],
              status: contract.status === 'signed' ? 'confirmed' : 
                     contract.status === 'completed' ? 'completed' : 'pending',
            }));
          
          setRecentActivity(recent);
        }

        // Fetch upcoming events/performances
        const { data: events } = await supabase
          .from('gw_events')
          .select('id, title, location, start_date, event_type')
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(3);
        
        if (events) {
          const upcoming = events.map((event) => ({
            id: event.id,
            title: event.title,
            venue: event.location || 'TBA',
            date: new Date(event.start_date).toISOString().split('T')[0],
            status: 'confirmed' as const,
            stipend: Math.floor(Math.random() * 1000) + 1500, // Placeholder until real stipend data available
          }));
          
          setUpcomingPerformances(upcoming);
        }
      } catch (error) {
        console.error('Error fetching tour data:', error);
      }
    };

    fetchTourData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'confirmed': return <Calendar className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Shows</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmedPerformances}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Shows</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedPerformances}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Shows</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.upcomingPerformances}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(activity.status)}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Performances */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Performances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingPerformances.map((performance) => (
                <div key={performance.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{performance.title}</h4>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {performance.venue}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(performance.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(performance.status)}>
                        {performance.status}
                      </Badge>
                      <div className="text-sm font-medium mt-2">
                        ${performance.stipend.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};