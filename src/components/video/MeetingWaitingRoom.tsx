import React, { useEffect, useState } from 'react';
import { Clock, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatInTimeZone } from 'date-fns-tz';

interface MeetingWaitingRoomProps {
  roomName: string;
  onMeetingStart: () => void;
  onCancel: () => void;
}

interface MeetingInfo {
  title: string;
  scheduled_at: string;
  description?: string;
  created_by?: string;
  host_name?: string;
}

export const MeetingWaitingRoom: React.FC<MeetingWaitingRoomProps> = ({
  roomName,
  onMeetingStart,
  onCancel,
}) => {
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    fetchMeetingInfo();
    
    // Poll for meeting status every 10 seconds
    const interval = setInterval(checkMeetingStatus, 10000);
    return () => clearInterval(interval);
  }, [roomName]);

  const fetchMeetingInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select(`
          title,
          scheduled_at,
          description,
          created_by,
          gw_profiles!scheduled_meetings_created_by_fkey(full_name)
        `)
        .eq('room_name', roomName)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMeetingInfo({
          title: data.title,
          scheduled_at: data.scheduled_at,
          description: data.description || undefined,
          created_by: data.created_by,
          host_name: (data.gw_profiles as any)?.full_name || undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching meeting info:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkMeetingStatus = async () => {
    if (checkingStatus) return;
    setCheckingStatus(true);

    try {
      // Check if the scheduled time has passed
      if (meetingInfo?.scheduled_at) {
        const scheduledTime = new Date(meetingInfo.scheduled_at);
        const now = new Date();
        
        // Meeting should start if scheduled time has passed
        if (now >= scheduledTime) {
          onMeetingStart();
          return;
        }
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleJoinNow = () => {
    onMeetingStart();
  };

  const timezone = 'America/New_York';
  const formattedTime = meetingInfo?.scheduled_at
    ? formatInTimeZone(new Date(meetingInfo.scheduled_at), timezone, "EEEE, MMMM d, yyyy 'at' h:mm a zzz")
    : null;

  const isScheduledTimeReached = meetingInfo?.scheduled_at
    ? new Date() >= new Date(meetingInfo.scheduled_at)
    : false;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 space-y-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          {/* Animated waiting icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>

          {/* Welcome message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Thank you for joining!
            </h2>
            <p className="text-muted-foreground">
              We will start shortly.
            </p>
          </div>

          {/* Meeting info */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin" />
              <span>Loading meeting details...</span>
            </div>
          ) : meetingInfo ? (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg text-left">
              <div>
                <p className="text-sm text-muted-foreground">Meeting</p>
                <p className="font-semibold text-foreground">{meetingInfo.title}</p>
              </div>
              {formattedTime && (
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled for</p>
                  <p className="font-medium text-foreground">{formattedTime}</p>
                </div>
              )}
              {meetingInfo.host_name && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Host: {meetingInfo.host_name}
                  </span>
                </div>
              )}
              {meetingInfo.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground">{meetingInfo.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Room: <span className="font-medium text-foreground">{roomName}</span>
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {isScheduledTimeReached && (
              <Button onClick={handleJoinNow} size="lg" className="w-full">
                <Video className="h-4 w-4 mr-2" />
                Join Meeting Now
              </Button>
            )}
            <Button variant="outline" onClick={onCancel} size="lg" className="w-full">
              Leave Waiting Room
            </Button>
          </div>

          {/* Status indicator */}
          {!isScheduledTimeReached && (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Waiting for host to start the meeting...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
