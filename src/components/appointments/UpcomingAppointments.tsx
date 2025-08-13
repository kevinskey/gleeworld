import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { Calendar, User, Clock, MapPin } from 'lucide-react';

export const UpcomingAppointments = () => {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['upcoming-appointments'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('gw_appointments')
        .select('*')
        .gte('appointment_date', now)
        .in('status', ['confirmed', 'pending_approval'])
        .order('appointment_date', { ascending: true })
        .limit(10);

      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending_approval':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRelativeDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM dd');
  };

  const getUrgencyLevel = (date: Date) => {
    const appointmentDate = new Date(date);
    const now = new Date();
    const diffHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours <= 2) return 'urgent';
    if (diffHours <= 24) return 'soon';
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'soon':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => {
              const appointmentDate = new Date(appointment.appointment_date);
              const urgency = getUrgencyLevel(appointmentDate);
              
              return (
                <div
                  key={appointment.id}
                  className={`p-4 border-l-4 rounded-lg ${getUrgencyColor(urgency)} transition-colors hover:shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">
                          {appointment.title}
                        </h4>
                        <Badge
                          variant="secondary"
                          className={getStatusColor(appointment.status)}
                        >
                          {formatStatus(appointment.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                        <User className="h-4 w-4" />
                        <span>{appointment.client_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {getRelativeDate(appointmentDate)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {format(appointmentDate, 'HH:mm')}
                        </span>
                        <span className="text-xs">
                          {appointment.duration_minutes} min
                        </span>
                      </div>
                      
                      {appointment.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {appointment.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {urgency === 'urgent' && (
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" variant="outline">
                        Start Meeting
                      </Button>
                      <Button size="sm" variant="ghost">
                        Reschedule
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};