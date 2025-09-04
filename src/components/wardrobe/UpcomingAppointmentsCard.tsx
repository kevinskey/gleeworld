import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isToday, isTomorrow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface WardrobeAppointment {
  id: string;
  title: string;
  appointment_date: string;
  client_name: string;
  status: string;
  notes?: string;
  duration_minutes: number;
}

export const UpcomingAppointmentsCard = () => {
  const navigate = useNavigate();
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['wardrobe-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .eq('status', 'confirmed')
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data as WardrobeAppointment[];
    }
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Appointments
          <Badge variant="secondary" className="ml-auto">
            {appointments?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading appointments...
          </div>
        ) : !appointments || appointments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No upcoming appointments
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm truncate">
                        {appointment.client_name}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(appointment.appointment_date)}</span>
                        <Clock className="h-3 w-3 ml-1" />
                        <span>{formatTime(appointment.appointment_date)}</span>
                      </div>
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-border/50">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/admin/appointments')}
            className="w-full"
          >
            Manage Appointments
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};