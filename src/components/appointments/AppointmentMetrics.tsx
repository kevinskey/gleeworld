import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const AppointmentMetrics = () => {
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['appointment-weekly-metrics'],
    queryFn: async () => {
      const today = new Date();
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const { data } = await supabase
        .from('gw_appointments')
        .select('appointment_date, status')
        .gte('appointment_date', oneWeekAgo.toISOString())
        .lte('appointment_date', today.toISOString());

      // Group by day
      const dailyStats = {};
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      days.forEach(day => {
        dailyStats[day] = 0;
      });

      data?.forEach(appointment => {
        const date = new Date(appointment.appointment_date);
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Adjust for Monday start
        dailyStats[dayName]++;
      });

      return Object.entries(dailyStats).map(([day, count]) => ({
        day,
        appointments: count,
      }));
    },
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['appointment-status-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_appointments')
        .select('status')
        .gte('appointment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const statusCounts = {};
      data?.forEach(appointment => {
        statusCounts[appointment.status] = (statusCounts[appointment.status] || 0) + 1;
      });

      const statusLabels = {
        'confirmed': 'Confirmed',
        'pending_approval': 'Pending',
        'cancelled': 'Cancelled',
        'completed': 'Completed',
        'no_show': 'No Show',
      };

      return Object.entries(statusCounts).map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
        color: getStatusColor(status),
      }));
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending_approval':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#3b82f6';
      case 'no_show':
        return '#6b7280';
      default:
        return '#9ca3af';
    }
  };

  if (weeklyLoading || statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointment Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading metrics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointment Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity */}
          <div>
            <h4 className="text-sm font-medium mb-4">Weekly Activity</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar 
                  dataKey="appointments" 
                  fill="hsl(var(--primary))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div>
            <h4 className="text-sm font-medium mb-4">Status Distribution (Last 30 days)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};