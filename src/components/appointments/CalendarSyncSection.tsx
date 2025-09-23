import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, Calendar, Download, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CalendarSyncSection = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Generate calendar feed URL (this would be a real endpoint in production)
  const calendarFeedUrl = `${window.location.origin}/api/calendar-feed/${Math.random().toString(36).substring(7)}`;

  const handleCopyFeedUrl = async () => {
    try {
      await navigator.clipboard.writeText(calendarFeedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Calendar feed URL copied",
        description: "You can now paste this into your calendar application",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try copying the URL manually",
        variant: "destructive",
      });
    }
  };

  const handleGoogleCalendarSync = () => {
    // In a real implementation, this would initiate OAuth flow with Google Calendar
    toast({
      title: "Google Calendar Integration",
      description: "This feature will be available soon. Use the calendar feed URL for now.",
    });
  };

  const handleOutlookSync = () => {
    // In a real implementation, this would handle Outlook/Office 365 integration
    toast({
      title: "Outlook Integration",
      description: "This feature will be available soon. Use the calendar feed URL for now.",
    });
  };

  const handleICalDownload = () => {
    // Generate and download an iCal file
    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GleeWorld//Provider Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:My Appointments
X-WR-TIMEZONE:America/New_York
X-WR-CALDESC:Your appointment calendar from GleeWorld
END:VCALENDAR`;

    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-appointments.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Calendar downloaded",
      description: "Import the .ics file into your preferred calendar application",
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Calendar Sync
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sync Your Calendar
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Keep your appointments synchronized with your personal calendar applications.
          </p>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Quick Sync Options</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={handleGoogleCalendarSync}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Sync with Google Calendar
                  <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={handleOutlookSync}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Sync with Outlook
                  <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Manual Options</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={handleICalDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download iCal File (.ics)
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Calendar Feed URL</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Subscribe to this URL in your calendar app for automatic updates
              </p>
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                  {calendarFeedUrl}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCopyFeedUrl}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <h5 className="text-sm font-medium mb-1">How to use calendar feeds:</h5>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Google Calendar: Settings → Add calendar → From URL</li>
              <li>• Apple Calendar: File → New Calendar Subscription</li>
              <li>• Outlook: Calendar → Add calendar → Subscribe from web</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};