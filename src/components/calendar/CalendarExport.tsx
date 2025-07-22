import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Calendar, ExternalLink, Copy, Check, Info, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const CalendarExport = () => {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const { toast } = useToast();

  const projectId = "oopmlreysjzuxzylyheb";
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  useEffect(() => {
    fetchUserToken();
  }, []);

  const fetchUserToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingToken(false);
        return;
      }

      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('calendar_feed_token')
        .eq('user_id', user.id)
        .single();

      setUserToken(profile?.calendar_feed_token || null);
    } catch (error) {
      console.error('Error fetching user token:', error);
    } finally {
      setIsLoadingToken(false);
    }
  };

  const exportCalendar = async (type: string, params: Record<string, string> = {}) => {
    setIsDownloading(type);
    try {
      const queryParams = new URLSearchParams({ type, ...params });
      const response = await fetch(`${baseUrl}/export-calendar?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to export calendar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spelman-glee-calendar-${type}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Calendar Exported",
        description: "Your calendar file has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const copyFeedUrl = async (feedType: string, eventType?: string) => {
    let feedUrl = `${baseUrl}/calendar-feed?type=${feedType}`;
    
    if (feedType === 'private' && userToken) {
      feedUrl += `&token=${userToken}`;
    }
    
    if (eventType) {
      feedUrl += `&event_type=${eventType}`;
    }
    
    const feedKey = `${feedType}-${eventType || 'all'}`;
    
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopiedFeed(feedKey);
      setTimeout(() => setCopiedFeed(null), 2000);
      toast({
        title: "Feed URL Copied",
        description: "Calendar feed URL has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy feed URL. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return {
      month: (now.getMonth() + 1).toString(),
      year: now.getFullYear().toString()
    };
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export & Subscribe to Calendar</DialogTitle>
          <DialogDescription>
            Download events or subscribe to live calendar feeds for Google Calendar, Outlook, and Apple Calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* One-time Exports */}
          <div>
            <h3 className="text-lg font-semibold mb-3">One-time Export</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => exportCalendar('public')}
                disabled={isDownloading === 'public'}
                className="h-auto p-4 text-left flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Public Events</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  All upcoming public events
                </span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const { month, year } = getCurrentMonth();
                  exportCalendar('month', { month, year });
                }}
                disabled={isDownloading === 'month'}
                className="h-auto p-4 text-left flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">This Month</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Current month's events
                </span>
              </Button>

              <Button
                variant="outline"
                onClick={() => exportCalendar('all')}
                disabled={isDownloading === 'all'}
                className="h-auto p-4 text-left flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">All Events</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  All past and future events
                </span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Live Calendar Feeds */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Live Calendar Feeds</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to these feeds to automatically receive calendar updates in your preferred calendar app.
            </p>
            
            <div className="space-y-4">
              {/* Public Feeds */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  Public Feeds <Badge variant="secondary">Auto-updating</Badge>
                </h4>
                <div className="space-y-3">
                  <FeedCard
                    title="All Public Events"
                    description="All upcoming public events"
                    url={`${baseUrl}/calendar-feed?type=public`}
                    onCopy={() => copyFeedUrl('public')}
                    copied={copiedFeed === 'public-all'}
                  />
                  <FeedCard
                    title="Public Performances"
                    description="Public performances and concerts only"
                    url={`${baseUrl}/calendar-feed?type=public&event_type=performance`}
                    onCopy={() => copyFeedUrl('public', 'performance')}
                    copied={copiedFeed === 'public-performance'}
                  />
                  <FeedCard
                    title="Public Rehearsals"
                    description="Public rehearsal schedule"
                    url={`${baseUrl}/calendar-feed?type=public&event_type=rehearsal`}
                    onCopy={() => copyFeedUrl('public', 'rehearsal')}
                    copied={copiedFeed === 'public-rehearsal'}
                  />
                </div>
              </div>

              {/* Private Feeds */}
              {userToken && !isLoadingToken && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    Private Feeds 
                    <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Authenticated</Badge>
                  </h4>
                  <div className="space-y-3">
                    <FeedCard
                      title="All Events (Private)"
                      description="All events including private ones"
                      url={`${baseUrl}/calendar-feed?type=private&token=${userToken}`}
                      onCopy={() => copyFeedUrl('private')}
                      copied={copiedFeed === 'private-all'}
                      isPrivate
                    />
                    <FeedCard
                      title="Private Performances"
                      description="All performances including private ones"
                      url={`${baseUrl}/calendar-feed?type=private&event_type=performance&token=${userToken}`}
                      onCopy={() => copyFeedUrl('private', 'performance')}
                      copied={copiedFeed === 'private-performance'}
                      isPrivate
                    />
                    <FeedCard
                      title="Private Meetings"
                      description="Internal meetings and admin events"
                      url={`${baseUrl}/calendar-feed?type=private&event_type=meeting&token=${userToken}`}
                      onCopy={() => copyFeedUrl('private', 'meeting')}
                      copied={copiedFeed === 'private-meeting'}
                      isPrivate
                    />
                  </div>
                </div>
              )}

              {!userToken && !isLoadingToken && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-800">Private Feeds Unavailable</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Private calendar feeds require a user profile. Please contact an administrator to set up your profile.
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">How to Use</h3>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-1">📥 One-time Export (.ics files)</h4>
                <p className="text-muted-foreground">
                  Download .ics files and import them into any calendar app. Events won't update automatically.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">🔄 Live Calendar Feeds</h4>
                <p className="text-muted-foreground">
                  Copy the feed URL and add it as a calendar subscription in your app. Events will update automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <h5 className="font-medium text-blue-600">Google Calendar</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    Settings → Add calendar → From URL
                  </p>
                </div>
                <div className="text-center">
                  <h5 className="font-medium text-orange-600">Outlook</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add calendar → Subscribe from web
                  </p>
                </div>
                <div className="text-center">
                  <h5 className="font-medium text-gray-600">Apple Calendar</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    File → New Calendar Subscription
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FeedCard = ({ 
  title, 
  description, 
  url,
  onCopy, 
  copied,
  isPrivate = false
}: { 
  title: string; 
  description: string; 
  url: string;
  onCopy: () => void; 
  copied: boolean;
  isPrivate?: boolean;
}) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {title}
            {isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
          </CardTitle>
          <CardDescription className="text-xs">
            {description}
          </CardDescription>
        </div>
        <Badge variant="secondary">Live</Badge>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
          {isPrivate ? url.replace(/token=[^&]+/, 'token=***') : url}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={onCopy}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </CardContent>
  </Card>
);