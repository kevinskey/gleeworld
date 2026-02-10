import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const OfficeHoursCard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch next available service info
  const { data: service } = useQuery({
    queryKey: ['office-hours-service'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_services')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's upcoming appointment
  const { data: upcomingAppointment } = useQuery({
    queryKey: ['office-hours-upcoming', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('appointment_date, status, title')
        .eq('created_by', user!.id)
        .in('status', ['confirmed', 'pending'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const statusColor = upcomingAppointment?.status === 'confirmed' ? 'success' : 'warning';

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold tracking-wide text-foreground">
          OFFICE HOURS with Dr. Johnson
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span>Rockefeller Fine Arts Building 105</span>
        </div>

        {service && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>{service.duration_minutes} min sessions</span>
          </div>
        )}

        {upcomingAppointment && (
          <div className="rounded-md bg-muted p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Upcoming Appointment</span>
              <Badge variant={statusColor} size="sm">
                {upcomingAppointment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(upcomingAppointment.appointment_date), 'MMM d, yyyy')}</span>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => navigate('/book-appointment')}
        >
          {upcomingAppointment ? 'Manage Appointment' : 'Book Appointment'}
        </Button>
      </CardContent>
    </Card>
  );
};
