import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CalendarSync {
  id: string;
  appointment_id: string;
  calendar_type: string;
  external_event_id: string;
  sync_status: string;
  last_sync_at: string;
  sync_error: string;
  appointment: {
    title: string;
    client_name: string;
    appointment_date: string;
  };
}

interface SyncSettings {
  google_enabled: boolean;
  apple_enabled: boolean;
  auto_sync: boolean;
}

export const AppointmentCalendarSync = () => {
  const { user } = useAuth();
  const [syncRecords, setSyncRecords] = useState<CalendarSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState<SyncSettings>({
    google_enabled: false,
    apple_enabled: false,
    auto_sync: true
  });

  useEffect(() => {
    if (user) {
      fetchSyncRecords();
      fetchSyncSettings();
    }
  }, [user]);

  const fetchSyncRecords = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_appointment_calendar_sync')
        .select(`
          *,
          appointment:gw_appointments(title, client_name, appointment_date)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSyncRecords(data || []);
    } catch (error) {
      toast.error('Failed to fetch sync records');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_user_appointment_preferences')
        .select('google_calendar_sync, apple_calendar_sync')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          google_enabled: data.google_calendar_sync || false,
          apple_enabled: data.apple_calendar_sync || false,
          auto_sync: true
        });
      }
    } catch (error) {
      // Settings not found, use defaults
    }
  };

  const updateSyncSettings = async (newSettings: Partial<SyncSettings>) => {
    if (!user) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      const { error } = await supabase
        .from('gw_user_appointment_preferences')
        .upsert([{
          user_id: user.id,
          google_calendar_sync: updatedSettings.google_enabled,
          apple_calendar_sync: updatedSettings.apple_enabled
        }]);

      if (error) throw error;
      toast.success('Sync settings updated');
    } catch (error) {
      toast.error('Failed to update sync settings');
    }
  };

  const connectGoogleCalendar = async () => {
    // In a real implementation, this would initiate OAuth flow
    toast.info('Google Calendar integration coming soon');
  };

  const connectAppleCalendar = async () => {
    // In a real implementation, this would use CalDAV or similar
    toast.info('Apple Calendar integration coming soon');
  };

  const syncAllAppointments = async () => {
    setSyncing(true);
    try {
      // This would call an edge function to sync all appointments
      const { error } = await supabase.functions.invoke('sync-calendar-appointments', {
        body: { user_id: user?.id }
      });

      if (error) throw error;
      toast.success('Calendar sync initiated');
      await fetchSyncRecords();
    } catch (error) {
      toast.error('Failed to sync appointments');
    } finally {
      setSyncing(false);
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Connections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Google Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Sync appointments to your Google Calendar
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.google_enabled}
                onCheckedChange={(checked) => updateSyncSettings({ google_enabled: checked })}
              />
              {!settings.google_enabled && (
                <Button variant="outline" size="sm" onClick={connectGoogleCalendar}>
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Apple Calendar */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium">Apple Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Sync appointments to your Apple Calendar
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.apple_enabled}
                onCheckedChange={(checked) => updateSyncSettings({ apple_enabled: checked })}
              />
              {!settings.apple_enabled && (
                <Button variant="outline" size="sm" onClick={connectAppleCalendar}>
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Sync Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={syncAllAppointments} 
              disabled={syncing || (!settings.google_enabled && !settings.apple_enabled)}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All Appointments'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">Loading...</div>
          ) : syncRecords.length === 0 ? (
            <div className="text-center p-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Sync Records</h3>
              <p className="text-muted-foreground">
                No calendar sync activity yet. Connect a calendar and sync your appointments.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSyncStatusIcon(record.sync_status)}
                    <div>
                      <h4 className="font-medium text-sm">
                        {record.appointment?.title || 'Unknown Appointment'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {record.appointment?.client_name} • {record.calendar_type}
                      </p>
                      {record.sync_error && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {record.sync_error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getSyncStatusColor(record.sync_status)}>
                      {record.sync_status}
                    </Badge>
                    {record.last_sync_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(record.last_sync_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};