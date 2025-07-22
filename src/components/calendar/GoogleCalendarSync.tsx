import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Download } from "lucide-react";

export const GoogleCalendarSync = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [accessToken, setAccessToken] = useState("");
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
    if (!calendarId || !accessToken) {
      toast({
        title: "Missing Information",
        description: "Please provide both Calendar ID and Access Token",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: {
          calendarId: calendarId,
          accessToken: accessToken
        }
      });

      if (error) throw error;

      toast({
        title: "Sync Successful!",
        description: `Imported ${data.imported} new events and updated ${data.updated} existing events from Google Calendar.`
      });

      // Clear the form
      setCalendarId("");
      setAccessToken("");
      
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Google Calendar. Please check your credentials and try again.",
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

        <div className="space-y-2">
          <Label htmlFor="accessToken">Access Token</Label>
          <Input
            id="accessToken"
            type="password"
            placeholder="Google Calendar API access token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Get this from Google OAuth or Google Cloud Console
          </p>
        </div>

        <Button 
          onClick={handleManualSync} 
          disabled={isSyncing || !calendarId || !accessToken}
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

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={handleGoogleAuth}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect with Google (OAuth)"
            )}
          </Button>
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