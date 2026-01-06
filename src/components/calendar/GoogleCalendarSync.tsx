import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Download, Star, Settings, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
export const GoogleCalendarSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);
  const [autoSyncConfigs, setAutoSyncConfigs] = useState<any[]>([]);
  const [showAutoSyncDialog, setShowAutoSyncDialog] = useState(false);
  const {
    toast
  } = useToast();
  const handleGoogleAuth = () => {
    // Redirect to Google OAuth
    const clientId = "YOUR_GOOGLE_CLIENT_ID"; // This would come from environment
    const redirectUri = encodeURIComponent(window.location.origin + "/calendar");
    const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar.readonly");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;
    window.location.href = authUrl;
  };
  const handleManualSync = async () => {
    if (!calendarId) {
      toast({
        title: "Missing Information",
        description: "Please provide your Calendar ID (usually your Gmail address)",
        variant: "destructive"
      });
      return;
    }
    setIsSyncing(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('sync-google-calendar', {
        body: {
          calendarId: calendarId
        }
      });
      if (error) throw error;
      toast({
        title: "Sync Successful!",
        description: `Imported ${data.imported} new events and updated ${data.updated} existing events from Google Calendar.`
      });

      // Clear the form
      setCalendarId("");
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Google Calendar. Please check your calendar ID and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };
  const handleHolidaySync = async () => {
    setIsSyncingHolidays(true);
    try {
      const currentYear = new Date().getFullYear();
      const {
        data,
        error
      } = await supabase.functions.invoke('sync-national-holidays', {
        body: {
          year: currentYear
        }
      });
      if (error) throw error;
      toast({
        title: "Holiday Sync Successful!",
        description: `Imported ${data.imported} new holidays and updated ${data.updated} existing holidays for ${currentYear}.`
      });
    } catch (error) {
      console.error('Holiday sync error:', error);
      toast({
        title: "Holiday Sync Failed",
        description: "Failed to sync national holidays. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncingHolidays(false);
    }
  };
  const fetchAutoSyncConfigs = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('gw_calendar_auto_sync').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setAutoSyncConfigs(data || []);
    } catch (error) {
      console.error('Error fetching auto-sync configs:', error);
    }
  };
  const handleAddAutoSync = async () => {
    if (!calendarId) {
      toast({
        title: "Missing Information",
        description: "Please provide your Calendar ID",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('gw_calendar_auto_sync').insert({
        calendar_id: calendarId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        is_active: true,
        sync_frequency_hours: 24
      });
      if (error) throw error;
      toast({
        title: "Auto-Sync Added!",
        description: "Calendar will now sync automatically every 24 hours."
      });
      setCalendarId("");
      fetchAutoSyncConfigs();
    } catch (error) {
      console.error('Error adding auto-sync:', error);
      toast({
        title: "Failed to Add Auto-Sync",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleToggleAutoSync = async (id: string, isActive: boolean) => {
    try {
      const {
        error
      } = await supabase.from('gw_calendar_auto_sync').update({
        is_active: !isActive
      }).eq('id', id);
      if (error) throw error;
      fetchAutoSyncConfigs();
    } catch (error) {
      console.error('Error toggling auto-sync:', error);
    }
  };
  const handleDeleteAutoSync = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from('gw_calendar_auto_sync').delete().eq('id', id);
      if (error) throw error;
      fetchAutoSyncConfigs();
      toast({
        title: "Auto-Sync Removed",
        description: "Calendar auto-sync configuration deleted."
      });
    } catch (error) {
      console.error('Error deleting auto-sync:', error);
    }
  };
  React.useEffect(() => {
    fetchAutoSyncConfigs();
  }, []);
  return <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Sync
        </CardTitle>
        <CardDescription>
          Import events from a public Google Calendar. Your synced events will appear on the GleeWorld calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="calendarId">Calendar ID</Label>
          <Input id="calendarId" placeholder="your-email@gmail.com or calendar-id" value={calendarId} onChange={e => setCalendarId(e.target.value)} className="bg-background" />
          <p className="text-xs text-muted-foreground">
            Your calendar must be set to "public" in Google Calendar settings for sync to work.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleManualSync} disabled={isSyncing || !calendarId} className="flex-1">
            {isSyncing ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </> : <>
                <Download className="mr-2 h-4 w-4" />
                Sync Now
              </>}
          </Button>
          
          <Button onClick={handleAddAutoSync} disabled={!calendarId} variant="outline" title="Add to auto-sync (every hour)">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {autoSyncConfigs.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Auto-Sync Calendars</span>
              <Dialog open={showAutoSyncDialog} onOpenChange={setShowAutoSyncDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Auto-Sync Settings</DialogTitle>
                    <DialogDescription>
                      Manage calendars that sync automatically every hour.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {autoSyncConfigs.map(config => <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox checked={config.is_active} onCheckedChange={() => handleToggleAutoSync(config.id, config.is_active)} />
                          <div>
                            <p className="text-sm font-medium">{config.calendar_id}</p>
                            <p className="text-xs text-muted-foreground">
                              Every {config.sync_frequency_hours}h • 
                              {config.last_sync_at ? ` Last: ${new Date(config.last_sync_at).toLocaleDateString()}` : ' Never synced'}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAutoSync(config.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>)}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {autoSyncConfigs.filter(c => c.is_active).length} of {autoSyncConfigs.length} calendars active
            </div>
          </div>
        )}
        
        <Button onClick={handleHolidaySync} disabled={isSyncingHolidays} variant="outline" className="w-full">
          {isSyncingHolidays ? <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing Holidays...
            </> : <>
              <Star className="mr-2 h-4 w-4" />
              Sync National Holidays
            </>}
        </Button>

        <div className="text-xs text-muted-foreground space-y-2 border-t pt-4">
          <p className="font-medium">How to make your Google Calendar public:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to Google Calendar settings</li>
            <li>Click on your calendar name</li>
            <li>Under "Access permissions", check "Make available to public"</li>
            <li>Copy your Calendar ID from "Integrate calendar" section</li>
          </ol>
        </div>
      </CardContent>
    </Card>;
};