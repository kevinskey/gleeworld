import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Clock, User, Ban, AlertCircle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  title: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
}

interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
  created_by?: string | null;
}

export const AdminCalendarView = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('gw_appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch blocked dates using raw SQL to avoid type issues
      const { data: blockedData, error: blockedError } = await supabase.rpc('get_blocked_dates');

      if (blockedError) throw blockedError;

      setAppointments(appointmentsData || []);
      setBlockedDates(blockedData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const blockDate = async (date: Date, reason?: string) => {
    try {
      const { error } = await supabase.rpc('block_date', {
        date_to_block: format(date, 'yyyy-MM-dd'),
        block_reason: reason || 'Date blocked by admin'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Date blocked successfully"
      });

      fetchData();
      setShowBlockDialog(false);
    } catch (error) {
      console.error('Error blocking date:', error);
      toast({
        title: "Error",
        description: "Failed to block date",
        variant: "destructive"
      });
    }
  };

  const unblockDate = async (blockId: string) => {
    try {
      const { error } = await supabase.rpc('unblock_date', {
        block_id: blockId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Date unblocked successfully"
      });

      fetchData();
    } catch (error) {
      console.error('Error unblocking date:', error);
      toast({
        title: "Error",
        description: "Failed to unblock date",
        variant: "destructive"
      });
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('gw_appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment cancelled"
      });

      fetchData();
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getDateAppointments = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.appointment_date), date)
    );
  };

  const getDateBlocked = (date: Date) => {
    return blockedDates.find(blocked => 
      isSameDay(new Date(blocked.blocked_date), date)
    );
  };

  const selectedDateAppointments = selectedDate ? getDateAppointments(selectedDate) : [];
  const selectedDateBlocked = selectedDate ? getDateBlocked(selectedDate) : null;

  const modifiers = {
    hasAppointments: (date: Date) => getDateAppointments(date).length > 0,
    blocked: (date: Date) => !!getDateBlocked(date)
  };

  const modifiersStyles = {
    hasAppointments: { 
      backgroundColor: 'hsl(var(--primary) / 0.1)',
      color: 'hsl(var(--primary))',
      fontWeight: 'bold'
    },
    blocked: {
      backgroundColor: 'hsl(var(--destructive) / 0.1)',
      color: 'hsl(var(--destructive))',
      textDecoration: 'line-through'
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
          />
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-primary/20"></div>
              <span>Has appointments</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-destructive/20"></div>
              <span>Blocked dates</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </span>
            {selectedDate && !selectedDateBlocked && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBlockDialog(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Block Date
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedDateBlocked && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium text-destructive">Date Blocked</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unblockDate(selectedDateBlocked.id)}
                >
                  Unblock
                </Button>
              </div>
              {selectedDateBlocked.reason && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedDateBlocked.reason}
                </p>
              )}
            </div>
          )}

          {selectedDateAppointments.length === 0 && !selectedDateBlocked ? (
            <div className="text-center py-8 text-muted-foreground">
              No appointments scheduled for this date
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateAppointments.map((appointment) => (
                <div 
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{appointment.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(appointment.appointment_date), 'h:mm a')}
                        <span>({appointment.duration_minutes} min)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        {appointment.client_name}
                      </div>
                    </div>
                    <Badge 
                      className={
                        appointment.status === 'confirmed' ? 'bg-status-confirmed text-status-confirmed-fg' :
                        appointment.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'cancelled' ? 'bg-status-cancelled text-status-cancelled-fg' :
                        'bg-status-scheduled text-status-scheduled-fg'
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">{selectedAppointment.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Date & Time:</span>
                    <p>{format(new Date(selectedAppointment.appointment_date), 'PPP p')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p>{selectedAppointment.duration_minutes} minutes</p>
                  </div>
                  <div>
                    <span className="font-medium">Client:</span>
                    <p>{selectedAppointment.client_name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p>{selectedAppointment.status}</p>
                  </div>
                  {selectedAppointment.client_email && (
                    <div className="col-span-2">
                      <span className="font-medium">Email:</span>
                      <p>{selectedAppointment.client_email}</p>
                    </div>
                  )}
                  {selectedAppointment.client_phone && (
                    <div className="col-span-2">
                      <span className="font-medium">Phone:</span>
                      <p>{selectedAppointment.client_phone}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  onClick={() => cancelAppointment(selectedAppointment.id)}
                  disabled={selectedAppointment.status === 'cancelled'}
                >
                  Cancel Appointment
                </Button>
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to block {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''} 
              from accepting new appointments?
            </p>
            <div className="flex gap-2">
              <Button onClick={() => selectedDate && blockDate(selectedDate)}>
                Block Date
              </Button>
              <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};