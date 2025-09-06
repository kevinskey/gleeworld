import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Users, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, MoreHorizontal, Filter } from 'lucide-react';
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
  const {
    user
  } = useAuth();
  const [userProfile, setUserProfile] = useState<{ first_name?: string; full_name?: string } | null>(null);
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
  const [upcomingAppointments, setUpcomingAppointments] = useState<RecentAppointment[]>([]);
  const [dailyOccupancy, setDailyOccupancy] = useState<DailyOccupancy[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDashboardData();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('gw_profiles')
        .select('first_name, full_name')
        .eq('user_id', user.id)
        .single();
      
      if (!error && profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };
  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // Expand date range to get more data (last 30 days to next 30 days)
      const monthStart = new Date();
      monthStart.setDate(monthStart.getDate() - 30);
      const monthEnd = new Date();
      monthEnd.setDate(monthEnd.getDate() + 30);
      console.log('Fetching appointments from:', monthStart.toISOString(), 'to:', monthEnd.toISOString());

      // Fetch appointments
      const {
        data: appointments,
        error
      } = await supabase.from('gw_appointments').select('*').gte('appointment_date', monthStart.toISOString()).lte('appointment_date', monthEnd.toISOString());
      if (error) throw error;
      console.log('Found appointments:', appointments?.length || 0);

      // Transform appointments  
      const recentAppointments: RecentAppointment[] = (appointments || []).map(apt => ({
        id: apt.id,
        date: format(new Date(apt.appointment_date), 'MMMM d, yyyy'),
        time: format(new Date(apt.appointment_date), 'h:mm a'),
        service: 'General Appointment',
        clientName: apt.client_name,
        status: apt.status,
        avatar: ''
      }));

      // Calculate stats
      const totalAppointments = appointments?.length || 0;
      const cancelledCount = appointments?.filter(apt => apt.status === 'cancelled').length || 0;
      const bookedCount = totalAppointments - cancelledCount;

      // Generate daily occupancy data (use current week for display)
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const daysInWeek = eachDayOfInterval({
        start: weekStart,
        end: weekEnd
      });
      const occupancyData = daysInWeek.map(day => {
        const dayAppointments = appointments?.filter(apt => isSameDay(new Date(apt.appointment_date), day)) || [];

        // Calculate actual max slots based on business hours and appointment duration
        const businessHours = 8; // Configurable business hours per day
        const averageSlotDuration = 30; // Average appointment duration in minutes
        const maxSlots = (businessHours * 60) / averageSlotDuration;
        const occupancy = Math.min(dayAppointments.length / maxSlots * 100, 100);
        return {
          date: format(day, 'yyyy-MM-dd'),
          occupancy: Math.round(occupancy)
        };
      });

      // Generate weekly trend data
      const trendData = daysInWeek.map(day => {
        const dayAppointments = appointments?.filter(apt => isSameDay(new Date(apt.appointment_date), day)) || [];
        return {
          day: format(day, 'EEE'),
          appointments: dayAppointments.length,
          revenue: dayAppointments.length * 100 // Estimated revenue per appointment
        };
      });

      // Sort appointments by date
      const allRecentAppointments = recentAppointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
      console.log('Total appointments found:', totalAppointments);
      console.log('Recent appointments:', allRecentAppointments);
      const avgOccupancy = Math.round(occupancyData.reduce((sum, day) => sum + day.occupancy, 0) / occupancyData.length);
      const estimatedRevenue = bookedCount * 100; // $100 per appointment estimate

      setStats({
        newCustomers: Math.floor(totalAppointments * 0.3),
        // 30% of appointments are new customers
        weeklyRevenue: estimatedRevenue,
        occupancyRate: avgOccupancy,
        bookedAppointments: bookedCount,
        cancelledAppointments: cancelledCount,
        revenueChange: 0,
        customerChange: 0,
        occupancyChange: 0
      });
      
      // Get upcoming appointments (future dates only)
      const now = new Date();
      const upcomingAppointmentsList = recentAppointments
        .filter(apt => new Date(apt.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3); // Get next 3 upcoming appointments
      
      setRecentAppointments(allRecentAppointments);
      setUpcomingAppointments(upcomingAppointmentsList);
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
    return <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="text-center py-8">Loading dashboard data...</div>
      </div>;
  }
  return <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hello, {userProfile?.first_name || userProfile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Provider'}.</h1>
        
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients</CardTitle>
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
              {stats.bookedAppointments > 0 ? <>
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">Active</span>
                </> : <span className="text-gray-500">No appointments yet</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {upcomingAppointments.length === 0 ? (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming appointments</h3>
                <p className="text-gray-500">Your next scheduled appointments will appear here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          upcomingAppointments.map((appointment, index) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {index === 0 ? 'Next' : `${index + 1} of ${upcomingAppointments.length}`}
                  </Badge>
                  {getStatusBadge(appointment.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">{appointment.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{appointment.time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">{appointment.clientName}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <Badge variant="secondary" className="text-xs">
                      {appointment.service}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
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
              {recentAppointments.length === 0 ? <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">No appointments found</p>
                  <p className="text-sm text-gray-400">Recent appointments will appear here</p>
                </div> : recentAppointments.map(appointment => <div key={appointment.id} className="flex items-center justify-between">
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
                  </div>)}
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
    </div>;
};