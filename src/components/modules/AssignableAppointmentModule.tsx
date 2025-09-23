import React from 'react';
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModuleProps } from '@/types/unified-modules';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, isToday, isThisWeek } from 'date-fns';

interface Appointment {
  id: string;
  appointment_date: string;
  client_name: string;
  client_email: string;
  appointment_type: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  duration_minutes: number;
  title: string;
}

export const AssignableAppointmentModule = ({ user, isFullPage = false }: ModuleProps) => {
  // Check if user is assigned as a service provider
  const { data: isServiceProvider = false } = useQuery({
    queryKey: ['service-provider-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('gw_service_providers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      return !error && !!data;
    },
    enabled: !!user?.id
  });

  // Fetch appointments assigned to this user
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['assigned-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id || !isServiceProvider) return [];
      
      const { data, error } = await supabase
        .from('gw_appointments')
        .select(`
          id,
          appointment_date,
          client_name,
          client_email,
          appointment_type,
          status,
          notes,
          duration_minutes,
          title
        `)
        .eq('provider_id', user.id)
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true });
      
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!user?.id && isServiceProvider
  });

  // Calculate stats
  const todayAppointments = appointments.filter(apt => 
    isToday(new Date(apt.appointment_date))
  ).length;

  const weekAppointments = appointments.filter(apt => 
    isThisWeek(new Date(apt.appointment_date))
  ).length;

  const pendingAppointments = appointments.filter(apt => 
    apt.status === 'pending'
  ).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from('gw_appointments')
      .update({ status: 'confirmed' })
      .eq('id', appointmentId);
    
    if (!error) {
      // Refresh appointments
      window.location.reload();
    }
  };

  if (!isServiceProvider) {
    return (
      <ModuleWrapper
        id="assignable-appointments"
        title="Appointments"
        description="Appointment management system"
        icon={Calendar}
        iconColor="blue"
        fullPage={isFullPage}
        defaultOpen={false}
      >
        <div className="p-6 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Not Assigned</h3>
          <p className="text-muted-foreground">
            You haven't been assigned as a service provider yet. Contact an administrator to get access.
          </p>
        </div>
      </ModuleWrapper>
    );
  }

  if (isFullPage) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Appointments</h1>
            <p className="text-muted-foreground">Manage your assigned appointments</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments}</div>
              <p className="text-xs text-muted-foreground">appointments today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weekAppointments}</div>
              <p className="text-xs text-muted-foreground">appointments this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingAppointments}</div>
              <p className="text-xs text-muted-foreground">need confirmation</p>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Upcoming Appointments</h3>
                <p className="text-muted-foreground">You don't have any appointments scheduled.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{appointment.client_name}</span>
                          </div>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(appointment.appointment_date), 'h:mm a')} ({appointment.duration_minutes}min)
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Service: </span>
                            <span>{appointment.appointment_type}</span>
                          </div>
                        </div>
                        
                        {appointment.notes && (
                          <div className="text-sm">
                            <span className="font-medium">Notes: </span>
                            <span className="text-muted-foreground">{appointment.notes}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {appointment.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleConfirmAppointment(appointment.id)}
                          >
                            Confirm
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ModuleWrapper
      id="assignable-appointments"
      title="My Appointments"
      description="Manage your assigned appointments and schedule"
      icon={Calendar}
      iconColor="blue"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{todayAppointments}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{weekAppointments}</div>
            <div className="text-xs text-muted-foreground">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{pendingAppointments}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Recent Appointments */}
        <div>
          <h4 className="font-medium mb-2">Next Appointments</h4>
          {appointments.slice(0, 3).map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <div>
                <div className="font-medium text-sm">{appointment.client_name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(appointment.appointment_date), 'MMM d, h:mm a')}
                </div>
              </div>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
          ))}
          
          {appointments.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No upcoming appointments
            </div>
          )}
        </div>

        <Button 
          className="w-full" 
          onClick={() => window.location.href = '/dashboard?module=assignable-appointments'}
        >
          View All Appointments
        </Button>
      </div>
    </ModuleWrapper>
  );
};