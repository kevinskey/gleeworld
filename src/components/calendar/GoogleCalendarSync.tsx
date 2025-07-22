import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Download } from "lucide-react";

export const GoogleCalendarSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const { toast } = useToast();

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
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Import events from your Google Calendar to the Spelman calendar system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="calendarId">Calendar ID</Label>
          <Input
            id="calendarId"
            placeholder="your-email@gmail.com or calendar-id"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use your Gmail address or find the Calendar ID in Google Calendar settings
          </p>
        </div>

        <Button 
          onClick={handleManualSync} 
          disabled={isSyncing || !calendarId}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Import from Google Calendar
            </>
          )}
        </Button>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">Ready to sync!</p>
          <p className="text-blue-700 dark:text-blue-300">Your Google API key has been configured. Just enter your Calendar ID above and click Import.</p>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How to get your Calendar ID:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to Google Calendar</li>
            <li>Click Settings (gear icon)</li>
            <li>Click on your calendar name</li>
            <li>Scroll down to find "Calendar ID"</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};