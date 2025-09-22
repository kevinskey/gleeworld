import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface WardrobeAppointment {
  id: string;
  client_name: string;
  client_email: string;
  appointment_date: string;
  appointment_time?: string;
  appointment_type: string;
  status: string;
  notes?: string;
  location?: string;
  client_phone?: string;
}

export const WardrobeAppointmentSystem = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<WardrobeAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today'>('upcoming');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Check if user is Drew or Soleil
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('gw_profiles')
          .select('email, full_name, exec_board_role')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        const allowedUsers = [
          'drewroberts@spelman.edu', 
          'soleilvailes@spelman.edu',
          'soleilvailes111@gmail.com'
        ];

        const userEmail = profile?.email?.toLowerCase() || '';
        const isWardrobe = profile?.exec_board_role === 'wardrobe_manager';
        const isAllowed = allowedUsers.includes(userEmail) || isWardrobe;
        
        setHasAccess(isAllowed);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [user]);

  // Fetch wardrobe-related appointments
  useEffect(() => {
    if (hasAccess) {
      fetchAppointments();
    }
  }, [hasAccess, filter]);

  const fetchAppointments = async () => {
    if (!hasAccess) return;

    setLoading(true);
    try {
      let query = supabase
        .from('gw_appointments')
        .select('*')
        .in('appointment_type', ['fitting', 'wardrobe_consultation', 'costume_alteration', 'dress_rehearsal'])
        .order('appointment_date', { ascending: true });

      // Apply filters
      const today = new Date().toISOString().split('T')[0];
      
      if (filter === 'today') {
        query = query.eq('appointment_date', today);
      } else if (filter === 'upcoming') {
        query = query.gte('appointment_date', today);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('gw_appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success('Appointment status updated');
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Access denied screen
  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This page is restricted to wardrobe managers only.
            </p>
            <p className="text-sm text-gray-500">
              Contact an administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading screen
  if (hasAccess === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading wardrobe appointments..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Wardrobe Appointments
          </h1>
          <p className="text-gray-600">
            Manage costume fittings, alterations, and wardrobe consultations
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-gray-500" />
              <div className="flex gap-2">
                <Button
                  variant={filter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('upcoming')}
                >
                  Upcoming
                </Button>
                <Button
                  variant={filter === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('today')}
                >
                  Today
                </Button>
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{appointments.length}</p>
                  <p className="text-sm text-gray-600">Total Appointments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'confirmed').length}
                  </p>
                  <p className="text-sm text-gray-600">Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'pending').length}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'completed').length}
                  </p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Wardrobe Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No wardrobe appointments found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {appointment.client_name}
                          </h3>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(appointment.appointment_date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {appointment.appointment_time ? formatTime(appointment.appointment_time) : 'Time TBD'}
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {appointment.appointment_type?.replace('_', ' ') || 'Wardrobe Appointment'}
                          </div>
                          {appointment.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {appointment.location}
                            </div>
                          )}
                        </div>
                        
                        {appointment.notes && (
                          <p className="mt-2 text-sm text-gray-600">
                            <strong>Notes:</strong> {appointment.notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {appointment.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                        )}
                        {appointment.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};