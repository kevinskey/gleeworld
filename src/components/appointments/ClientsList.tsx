import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Phone, Mail, Calendar as CalendarIcon, Search, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  total_appointments: number;
  last_appointment: string | null;
  upcoming_appointments: number;
  status_summary: Record<string, number>;
}

interface ClientAppointment {
  id: string;
  title: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  appointment_type: string;
  notes: string | null;
}

export const ClientsList = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAppointments, setClientAppointments] = useState<ClientAppointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchClients = async () => {
    setLoading(true);
    try {
      // Get all appointments grouped by client
      const { data: appointmentsData, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      // Group appointments by client and create client summary
      const clientMap = new Map<string, Client>();

      appointmentsData?.forEach(appointment => {
        const clientKey = `${appointment.client_name}-${appointment.client_email || 'no-email'}`;
        
        if (!clientMap.has(clientKey)) {
          clientMap.set(clientKey, {
            id: clientKey,
            client_name: appointment.client_name,
            client_email: appointment.client_email,
            client_phone: appointment.client_phone,
            total_appointments: 0,
            last_appointment: null,
            upcoming_appointments: 0,
            status_summary: {}
          });
        }

        const client = clientMap.get(clientKey)!;
        client.total_appointments++;
        
        // Track status summary
        if (!client.status_summary[appointment.status]) {
          client.status_summary[appointment.status] = 0;
        }
        client.status_summary[appointment.status]++;

        // Update last appointment date
        if (!client.last_appointment || new Date(appointment.appointment_date) > new Date(client.last_appointment)) {
          client.last_appointment = appointment.appointment_date;
        }

        // Count upcoming appointments
        if (new Date(appointment.appointment_date) > new Date() && appointment.status !== 'cancelled') {
          client.upcoming_appointments++;
        }
      });

      setClients(Array.from(clientMap.values()));
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientAppointments = async (clientName: string, clientEmail: string | null) => {
    try {
      const query = supabase
        .from('gw_appointments')
        .select('*')
        .eq('client_name', clientName)
        .order('appointment_date', { ascending: false });

      if (clientEmail) {
        query.eq('client_email', clientEmail);
      } else {
        query.is('client_email', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClientAppointments(data || []);
    } catch (error) {
      console.error('Error fetching client appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load client appointments",
        variant: "destructive"
      });
    }
  };

  const openClientDialog = (client: Client) => {
    setSelectedClient(client);
    fetchClientAppointments(client.client_name, client.client_email);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.client_email && client.client_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.client_phone && client.client_phone.includes(searchTerm))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-status-confirmed text-status-confirmed-fg';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-status-cancelled text-status-cancelled-fg';
      case 'completed': return 'bg-status-completed text-status-completed-fg';
      default: return 'bg-status-scheduled text-status-scheduled-fg';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Clients ({filteredClients.length})
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No clients found matching your search' : 'No clients found'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div 
                  key={client.id}
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => openClientDialog(client)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{client.client_name}</h3>
                        {client.upcoming_appointments > 0 && (
                          <Badge className="bg-primary/10 text-primary">
                            {client.upcoming_appointments} upcoming
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {client.client_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {client.client_email}
                          </div>
                        )}
                        {client.client_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {client.client_phone}
                          </div>
                        )}
                        {client.last_appointment && (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Last appointment: {format(new Date(client.last_appointment), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div className="text-sm font-medium">
                        {client.total_appointments} total appointments
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {Object.entries(client.status_summary).map(([status, count]) => (
                          <Badge key={status} size="sm" className={getStatusColor(status)}>
                            {status}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedClient?.client_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedClient.total_appointments}</div>
                      <div className="text-sm text-muted-foreground">Total Appointments</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedClient.upcoming_appointments}</div>
                      <div className="text-sm text-muted-foreground">Upcoming</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {selectedClient.status_summary.completed || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Appointment History</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {clientAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{appointment.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            {format(new Date(appointment.appointment_date), 'PPP p')}
                            <span>({appointment.duration_minutes} min)</span>
                          </div>
                          {appointment.notes && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MessageSquare className="h-4 w-4 mt-0.5" />
                              <span>{appointment.notes}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                          <Badge variant="outline">
                            {appointment.appointment_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};