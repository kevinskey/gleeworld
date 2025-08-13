import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Calendar, Link, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export const CalendarIntegration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Simplified for now - will be enhanced once schema is updated
  const integrationStatus = null;
  const isLoading = false;

  // Simplified for now - will be enhanced once schema is updated  
  const syncSettings = { google_calendar_sync: false, apple_calendar_sync: false };
  const settingsLoading = false;

  const updateSyncSettings = useMutation({
    mutationFn: async ({ google_sync, apple_sync }: { google_sync: boolean; apple_sync: boolean }) => {
      const { error } = await supabase
        .from('gw_user_appointment_preferences')
        .upsert([{
          user_id: user?.id,
          google_calendar_sync: google_sync,
          apple_calendar_sync: apple_sync,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-sync-settings'] });
      toast.success('Calendar sync settings updated');
    },
    onError: (error) => {
      console.error('Error updating sync settings:', error);
      toast.error('Failed to update calendar sync settings');
    },
  });

  const initiateGoogleConnect = async () => {
    setIsConnecting(true);
    try {
      // This would integrate with Google Calendar API
      // For now, we'll simulate the connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calendar integration would go here in a real implementation
      // For now, just show success message
      toast.success('Google Calendar connected successfully (simulated)');
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast.error('Failed to connect to Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectCalendar = useMutation({
    mutationFn: async (provider: string) => {
      // Calendar disconnect would go here in a real implementation
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast.success('Calendar disconnected');
    },
    onError: (error) => {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect calendar');
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
    onSuccess: () => {
      toast.success('Calendar sync completed');
    },
    onError: (error) => {
      console.error('Error syncing calendar:', error);
      toast.error('Failed to sync calendar');
    },
  });

  if (isLoading || settingsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isGoogleConnected = false; // Simplified for now
  const lastSync = null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Google Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Sync appointments with your Google Calendar
                </p>
                {isGoogleConnected && lastSync && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last synced: {lastSync.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isGoogleConnected ? (
                <>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncNow.mutate()}
                    disabled={syncNow.isPending}
                  >
                    {syncNow.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectCalendar.mutate('google')}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                  <Button
                    onClick={initiateGoogleConnect}
                    disabled={isConnecting}
                    size="sm"
                  >
                    {isConnecting ? (
                      <>Connecting...</>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Apple Calendar */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg opacity-50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium">Apple Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Sync appointments with your Apple Calendar
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary">
                Coming Soon
              </Badge>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="border-t pt-6">
            <h4 className="font-medium mb-4">Sync Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-way sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Changes in external calendar update appointments here
                  </p>
                </div>
                <Switch
                  checked={syncSettings?.google_calendar_sync || false}
                  onCheckedChange={(checked) => 
                    updateSyncSettings.mutate({
                      google_sync: checked,
                      apple_sync: syncSettings?.apple_calendar_sync || false
                    })
                  }
                  disabled={!isGoogleConnected}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-sync new appointments</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically add new appointments to calendar
                  </p>
                </div>
                <Switch
                  checked={true}
                  disabled={!isGoogleConnected}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sync reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Include appointment reminders in calendar events
                  </p>
                </div>
                <Switch
                  checked={true}
                  disabled={!isGoogleConnected}
                />
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {isGoogleConnected ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your appointments are being synced with Google Calendar. 
                New appointments will automatically appear in your calendar.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Connect your calendar to automatically sync appointments and avoid double-booking.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};