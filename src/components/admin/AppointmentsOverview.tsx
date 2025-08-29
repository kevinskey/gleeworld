import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Mail, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  appointment_type: string;
  description?: string;
  created_at: string;
}

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800'
};

export const AppointmentsOverview = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('gw_appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateFilter) {
        const startDate = new Date(dateFilter);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        
        query = query.gte('appointment_date', startDate.toISOString())
                     .lte('appointment_date', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Appointment[];
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('gw_appointments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment status updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_appointments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment deleted!');
    },
    onError: (error) => {
      toast.error(`Failed to delete appointment: ${error.message}`);
    }
  });

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'h:mm a')
    };
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.appointment_date) >= now && 
      apt.status !== 'cancelled'
    ).slice(0, 5);
  };

  const getTodaysAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= today && aptDate < tomorrow;
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{getTodaysAppointments().length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{getUpcomingAppointments().length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{appointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {appointments.filter(apt => {
                    const aptDate = new Date(apt.appointment_date);
                    const now = new Date();
                    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return aptDate >= now && aptDate <= weekFromNow;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="date-filter">Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Appointments List */}
          {isLoading ? (
            <p>Loading appointments...</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => {
                const { date, time } = formatDateTime(appointment.appointment_date);
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{appointment.client_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.appointment_type} • {appointment.duration_minutes} min
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">{date}</div>
                        <div className="text-muted-foreground">{time} EST</div>
                      </div>
                      <Badge className={STATUS_COLORS[appointment.status]}>
                        {appointment.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-right">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{appointment.client_email}</span>
                        </div>
                        {appointment.client_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{appointment.client_phone}</span>
                          </div>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {appointment.status === 'scheduled' && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ 
                                id: appointment.id, 
                                status: 'confirmed' 
                              })}
                            >
                              Confirm
                            </DropdownMenuItem>
                          )}
                          {appointment.status !== 'completed' && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ 
                                id: appointment.id, 
                                status: 'completed' 
                              })}
                            >
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => updateStatusMutation.mutate({ 
                              id: appointment.id, 
                              status: 'cancelled' 
                            })}
                          >
                            Cancel
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this appointment?')) {
                                deleteMutation.mutate(appointment.id);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
              
              {appointments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No appointments found for the selected criteria.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};