import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react';

export const AppointmentStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['appointment-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartISO = weekStart.toISOString().split('T')[0];

      // Get total appointments
      const { count: totalCount } = await supabase
        .from('gw_appointments')
        .select('*', { count: 'exact', head: true });

      // Get today's appointments
      const { count: todayCount } = await supabase
        .from('gw_appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', today)
        .lt('appointment_date', new Date(new Date(today).getTime() + 24*60*60*1000).toISOString().split('T')[0]);

      // Get this week's appointments
      const { count: weekCount } = await supabase
        .from('gw_appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', weekStartISO);

      // Get pending appointments
      const { count: pendingCount } = await supabase
        .from('gw_appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');

      // Get confirmed appointments
      const { count: confirmedCount } = await supabase
        .from('gw_appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');

      // Get cancelled appointments
      const { count: cancelledCount } = await supabase
        .from('gw_appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled');

      return {
        total: totalCount || 0,
        today: todayCount || 0,
        thisWeek: weekCount || 0,
        pending: pendingCount || 0,
        confirmed: confirmedCount || 0,
        cancelled: cancelledCount || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Appointments',
      value: stats?.total || 0,
      icon: Calendar,
      description: 'All time',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Today',
      value: stats?.today || 0,
      icon: Clock,
      description: 'Appointments today',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'This Week',
      value: stats?.thisWeek || 0,
      icon: TrendingUp,
      description: 'Weekly appointments',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pending',
      value: stats?.pending || 0,
      icon: Clock,
      description: 'Awaiting approval',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Confirmed',
      value: stats?.confirmed || 0,
      icon: CheckCircle,
      description: 'Confirmed appointments',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Cancelled',
      value: stats?.cancelled || 0,
      icon: XCircle,
      description: 'Cancelled appointments',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};