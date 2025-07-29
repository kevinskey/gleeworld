import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, FileText, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AppointmentHistoryItem {
  id: string;
  appointment_id: string;
  action_type: string;
  performed_by: string;
  old_values: any;
  new_values: any;
  notes: string;
  created_at: string;
  appointment: {
    title: string;
    client_name: string;
    appointment_date: string;
  };
  performer?: {
    full_name: string;
    email: string;
  };
}

export const AppointmentHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<AppointmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_appointment_history')
        .select(`
          *,
          appointment:gw_appointments(title, client_name, appointment_date)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      toast.error('Failed to fetch appointment history');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <Calendar className="h-4 w-4" />;
      case 'approved':
        return <Clock className="h-4 w-4" />;
      case 'denied':
        return <FileText className="h-4 w-4" />;
      case 'cancelled':
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800';
      case 'rescheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesFilter = filter === 'all' || item.action_type === filter;
    const matchesSearch = searchTerm === '' || 
      item.appointment?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.appointment?.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.performer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search appointments or people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="rescheduled">Rescheduled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchHistory}>
          <Filter className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* History Items */}
      <div className="space-y-4">
        {filteredHistory.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getActionColor(item.action_type)}`}>
                    {getActionIcon(item.action_type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {item.appointment?.title || 'Unknown Appointment'}
                      </h4>
                      <Badge className={getActionColor(item.action_type)}>
                        {item.action_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Client: {item.appointment?.client_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Performed by: System
                    </p>
                    {item.appointment?.appointment_date && (
                      <p className="text-sm text-muted-foreground">
                        Appointment Date: {format(new Date(item.appointment.appointment_date), 'PPP p')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'PPP')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), 'p')}
                  </p>
                </div>
              </div>

              {/* Show changes if available */}
              {(item.old_values || item.new_values) && (
                <div className="mt-3 pt-3 border-t">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View Changes
                    </summary>
                    <div className="mt-2 space-y-2">
                      {item.old_values && (
                        <div>
                          <span className="font-medium">Previous:</span>
                          <pre className="text-xs bg-muted p-2 rounded mt-1">
                            {JSON.stringify(item.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {item.new_values && (
                        <div>
                          <span className="font-medium">New:</span>
                          <pre className="text-xs bg-muted p-2 rounded mt-1">
                            {JSON.stringify(item.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredHistory.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No History Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filter !== 'all' 
                  ? 'No appointment history matches your current filters.'
                  : 'No appointment history available yet.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};