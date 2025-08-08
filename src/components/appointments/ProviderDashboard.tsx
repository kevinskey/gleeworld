import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Filter
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parse, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AppointmentStats {
  newCustomers: number;
  weeklyRevenue: number;
  occupancyRate: number;
  bookedAppointments: number;
  cancelledAppointments: number;
  revenueChange: number;
  customerChange: number;
  occupancyChange: number;
}

interface RecentAppointment {
  id: string;
  date: string;
  time: string;
  service: string;
  clientName: string;
  status: string;
  avatar?: string;
}

interface DailyOccupancy {
  date: string;
  occupancy: number;
}

export const ProviderDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AppointmentStats>({
    newCustomers: 0,
    weeklyRevenue: 0,
    occupancyRate: 0,
    bookedAppointments: 0,
    cancelledAppointments: 0,
    revenueChange: 0,
    customerChange: 0,
    occupancyChange: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [dailyOccupancy, setDailyOccupancy] = useState<DailyOccupancy[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      
      // Fetch auditions as primary appointments
      const { data: auditions, error: auditionsError } = await supabase
        .from('gw_auditions')
        .select('*')
        .gte('audition_date', weekStart.toISOString())
        .lte('audition_date', weekEnd.toISOString());

      if (auditionsError) throw auditionsError;

      // Fetch regular appointments
      const { data: appointments, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .gte('appointment_date', weekStart.toISOString())
        .lte('appointment_date', weekEnd.toISOString());

      if (error) throw error;

      // Transform auditions to appointment format (primary)
      const auditionAppointments: RecentAppointment[] = (auditions || []).map(audition => {
        // Combine audition_date and audition_time properly
        let combinedDateTime: Date;
        try {
          const dateOnly = audition.audition_date.split('T')[0];
          const timeString = audition.audition_time || '12:00 PM';
          
          const timeParsed = parse(timeString, 'h:mm a', new Date());
          const hours = timeParsed.getHours();
          const minutes = timeParsed.getMinutes();
          
          combinedDateTime = new Date(dateOnly + 'T00:00:00');
          combinedDateTime.setHours(hours, minutes, 0, 0);
        } catch (error) {
          console.error('Error parsing audition time:', error);
          combinedDateTime = parseISO(audition.audition_date);
        }

        return {
          id: audition.id,
          date: format(combinedDateTime, 'MMMM d, yyyy'),
          time: audition.audition_time || format(combinedDateTime, 'h:mm a'),
          service: 'Audition Appointment',
          clientName: `${audition.first_name} ${audition.last_name}`,
          status: audition.status || 'scheduled',
          avatar: ''
        };
      });

      // Transform regular appointments (secondary)
      const regularAppointments: RecentAppointment[] = (appointments || []).map(apt => ({
        id: apt.id,
        date: format(new Date(apt.appointment_date), 'MMMM d, yyyy'),
        time: format(new Date(apt.appointment_date), 'h:mm a'),
        service: apt.title || 'General Appointment',
        clientName: apt.client_name,
        status: apt.status,
        avatar: ''
      }));

      // Calculate stats (auditions as primary appointments)
      const totalAppointments = (auditions?.length || 0) + (appointments?.length || 0);
      const cancelledCount = (auditions?.filter(aud => aud.status === 'cancelled').length || 0) + 
                           (appointments?.filter(apt => apt.status === 'cancelled').length || 0);
      
      const bookedCount = totalAppointments - cancelledCount;
      
      // Generate daily occupancy data (auditions as primary)
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const occupancyData = daysInWeek.map(day => {
        const dayAuditions = auditions?.filter(aud => isSameDay(new Date(aud.audition_date), day)) || [];
        const dayAppointments = appointments?.filter(apt => isSameDay(new Date(apt.appointment_date), day)) || [];
        const totalDayAppointments = dayAuditions.length + dayAppointments.length;
        
        
        // Assuming 8 hours per day, 15-minute audition slots = 32 possible slots
        const maxSlots = 32;
        const occupancy = Math.min((totalDayAppointments / maxSlots) * 100, 100);
        
        return {
          date: format(day, 'yyyy-MM-dd'),
          occupancy: Math.round(occupancy)
        };
      });

      // Generate weekly trend data (auditions focused)
      const trendData = daysInWeek.map(day => {
        const dayAuditions = auditions?.filter(aud => isSameDay(new Date(aud.audition_date), day)) || [];
        const dayAppointments = appointments?.filter(apt => isSameDay(new Date(apt.appointment_date), day)) || [];
        
        const totalDaily = dayAuditions.length + dayAppointments.length;
        
        return {
          day: format(day, 'EEE'),
          appointments: totalDaily,
          revenue: totalDaily * 150 // Estimated revenue per appointment
        };
      });

      // Combine all appointments (auditions first, then regular appointments)
      const allRecentAppointments = [...auditionAppointments, ...regularAppointments]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);

      const avgOccupancy = Math.round(occupancyData.reduce((sum, day) => sum + day.occupancy, 0) / occupancyData.length);
      const estimatedRevenue = bookedCount * 75; // $75 per audition appointment estimate

      setStats({
        newCustomers: Math.floor(auditions?.length * 0.8 || 0), // Most auditioners are new students
        weeklyRevenue: estimatedRevenue,
        occupancyRate: avgOccupancy,
        bookedAppointments: bookedCount,
        cancelledAppointments: cancelledCount,
        revenueChange: 12.5,
        customerChange: -5.2,
        occupancyChange: 0
      });

      setRecentAppointments(allRecentAppointments);
      setDailyOccupancy(occupancyData);
      setWeeklyData(trendData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 81) return 'bg-red-600';
    if (occupancy >= 41) return 'bg-orange-500';
    if (occupancy >= 21) return 'bg-orange-300';
    return 'bg-gray-200';
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'approved':
      case 'scheduled':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hello, {user?.email?.split('@')[0] || 'Provider'}.</h1>
        <p className="text-gray-600">Welcome to your Well-Launched dashboard.</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newCustomers}</div>
            <div className="flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-500">{Math.abs(stats.customerChange)}% Decrease</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.weeklyRevenue.toLocaleString()}</div>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">{stats.revenueChange}% Increase</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
            <div className="flex items-center text-sm text-gray-500">
              <span>— Stable</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bookedAppointments}</div>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">84.7% Increase</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments booked | Cancelled appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bookedAppointments} | {stats.cancelledAppointments}</div>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">200% Increase</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Daily occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <div key={index} className="text-center text-xs text-gray-500 font-medium">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dailyOccupancy.map((day, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded ${getOccupancyColor(day.occupancy)} flex items-center justify-center`}
                  title={`${day.occupancy}% occupancy`}
                >
                  {day.occupancy > 60 && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span>81% and higher</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>Between 41% and 80%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-300 rounded"></div>
                <span>Between 21% and 40%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded"></div>
                <span>20% and lower</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Last booked appointments</CardTitle>
            </div>
            <Button variant="outline" size="sm">
              All Statuses <Filter className="h-4 w-4 ml-2" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm">
                      <div className="font-medium">{appointment.date}</div>
                      <div className="text-gray-500">{appointment.time}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {appointment.service}
                      </Badge>
                      <span className="text-sm font-medium">{appointment.clientName}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(appointment.status)}
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {appointment.clientName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center text-gray-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                <p>Weekly Performance Chart</p>
                <p className="text-sm">Chart visualization coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};