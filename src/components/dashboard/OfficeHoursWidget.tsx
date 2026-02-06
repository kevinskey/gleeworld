import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays,
  User, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, isAfter } from 'date-fns';
import { toast } from 'sonner';

interface OfficeHoursAppointment {
  id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  appointment_type: string;
  notes: string | null;
  created_at: string;
}

export const OfficeHoursWidget = () => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['office-hours-upcoming'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(15);

      if (error) throw error;
      return (data || []) as unknown as OfficeHoursAppointment[];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('gw_appointments')
        .update({
          status,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['office-hours-upcoming'] });
      toast.success(`Appointment ${status === 'confirmed' ? 'approved' : 'denied'}`);
    },
    onError: (error) => {
      toast.error('Failed to update: ' + (error as Error).message);
    },
  });

  const pendingCount = appointments.filter(a => a.status === 'pending' || a.status === 'pending_approval').length;
  const todayAppts = appointments.filter(a => {
    try {
      return isToday(parseISO(a.appointment_date));
    } catch { return false; }
  });
  const upcomingAppts = appointments.filter(a => {
    try {
      return !isToday(parseISO(a.appointment_date));
    } catch { return false; }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-emerald-600 text-white text-[10px] px-1.5"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-[10px] px-1.5"><XCircle className="h-2.5 w-2.5 mr-0.5" />Cancelled</Badge>;
      case 'pending':
      case 'pending_approval':
        return <Badge className="bg-amber-500 text-white text-[10px] px-1.5"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return 'Today';
      if (isTomorrow(d)) return 'Tomorrow';
      return format(d, 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <Card className="border-primary/20 shadow-md overflow-hidden">
      <CardHeader
        className="py-3 px-4 bg-gradient-to-r from-cyan-700 to-cyan-900 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-white" />
            <CardTitle className="text-sm font-bold text-white">Office Hours</CardTitle>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 animate-pulse">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70">{appointments.length} upcoming</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-white/70" /> : <ChevronDown className="h-3.5 w-3.5 text-white/70" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
          ) : appointments.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No upcoming appointments
            </div>
          ) : (
            <ScrollArea className="max-h-[320px]">
              {/* Today's appointments */}
              {todayAppts.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/30 border-b">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">
                      Today ({todayAppts.length})
                    </span>
                  </div>
                  {todayAppts.map((appt) => (
                    <AppointmentRow
                      key={appt.id}
                      appt={appt}
                      getStatusBadge={getStatusBadge}
                      formatTime={formatTime}
                      formatDate={formatDate}
                      onApprove={() => updateStatus.mutate({ id: appt.id, status: 'confirmed' })}
                      onDeny={() => updateStatus.mutate({ id: appt.id, status: 'cancelled' })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              )}

              {/* Upcoming appointments */}
              {upcomingAppts.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-muted/50 border-b border-t">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Upcoming ({upcomingAppts.length})
                    </span>
                  </div>
                  {upcomingAppts.map((appt) => (
                    <AppointmentRow
                      key={appt.id}
                      appt={appt}
                      getStatusBadge={getStatusBadge}
                      formatTime={formatTime}
                      formatDate={formatDate}
                      onApprove={() => updateStatus.mutate({ id: appt.id, status: 'confirmed' })}
                      onDeny={() => updateStatus.mutate({ id: appt.id, status: 'cancelled' })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
};

interface AppointmentRowProps {
  appt: OfficeHoursAppointment;
  getStatusBadge: (status: string) => React.ReactNode;
  formatTime: (dateStr: string) => string;
  formatDate: (dateStr: string) => string;
  onApprove: () => void;
  onDeny: () => void;
  isPending: boolean;
}

const AppointmentRow = ({ appt, getStatusBadge, formatTime, formatDate, onApprove, onDeny, isPending }: AppointmentRowProps) => {
  const isPendingApproval = appt.status === 'pending' || appt.status === 'pending_approval';

  return (
    <div className="px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">{appt.client_name}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatDate(appt.appointment_date)} • {formatTime(appt.appointment_date)}
            </span>
            <span>{appt.duration_minutes}min</span>
          </div>
          {appt.notes && (
            <div className="mt-1 flex items-start gap-1">
              <MessageSquare className="h-2.5 w-2.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground line-clamp-1">{appt.notes}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {getStatusBadge(appt.status)}
          {isPendingApproval && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                onClick={onApprove}
                disabled={isPending}
              >
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                onClick={onDeny}
                disabled={isPending}
              >
                <XCircle className="h-3 w-3 mr-0.5" />
                Deny
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
