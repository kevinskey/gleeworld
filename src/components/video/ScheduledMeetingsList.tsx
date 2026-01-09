import React from 'react';
import { format, isPast, isFuture, differenceInMinutes } from 'date-fns';
import { Video, Clock, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ScheduledMeeting {
  id: string;
  title: string;
  description: string | null;
  room_name: string;
  scheduled_at: string;
  duration_minutes: number;
  created_by: string;
  status: string;
}

interface ScheduledMeetingsListProps {
  onJoinMeeting: (roomName: string) => void;
}

export const ScheduledMeetingsList: React.FC<ScheduledMeetingsListProps> = ({
  onJoinMeeting,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['scheduled-meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Include meetings from last 24 hours
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as ScheduledMeeting[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Meeting Cancelled',
        description: 'The scheduled meeting has been cancelled',
      });
      queryClient.invalidateQueries({ queryKey: ['scheduled-meetings'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel meeting',
        variant: 'destructive',
      });
    }
  };

  const getMeetingStatus = (meeting: ScheduledMeeting) => {
    const scheduledTime = new Date(meeting.scheduled_at);
    const endTime = new Date(scheduledTime.getTime() + meeting.duration_minutes * 60000);
    const now = new Date();

    if (now >= scheduledTime && now <= endTime) {
      return 'live';
    } else if (now > endTime) {
      return 'ended';
    } else {
      const minutesUntil = differenceInMinutes(scheduledTime, now);
      if (minutesUntil <= 15) {
        return 'starting-soon';
      }
      return 'upcoming';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-green-500 text-white animate-pulse">Live Now</Badge>;
      case 'starting-soon':
        return <Badge variant="secondary" className="bg-amber-500 text-white">Starting Soon</Badge>;
      case 'ended':
        return <Badge variant="outline">Ended</Badge>;
      default:
        return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No upcoming meetings scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Meetings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {meetings.map((meeting) => {
          const status = getMeetingStatus(meeting);
          const canJoin = status === 'live' || status === 'starting-soon';
          const isOwner = meeting.created_by === user?.id;

          return (
            <div
              key={meeting.id}
              className={cn(
                'p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                status === 'live' && 'border-green-500 bg-green-500/5',
                status === 'starting-soon' && 'border-amber-500 bg-amber-500/5'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium truncate">{meeting.title}</h4>
                  {getStatusBadge(status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(meeting.scheduled_at), 'PPP')} at{' '}
                  {format(new Date(meeting.scheduled_at), 'p')}
                  <span className="mx-1">•</span>
                  {meeting.duration_minutes} min
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canJoin && (
                  <Button
                    size="sm"
                    onClick={() => onJoinMeeting(meeting.room_name)}
                    className={status === 'live' ? 'animate-pulse' : ''}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Join
                  </Button>
                )}
                {isOwner && status !== 'live' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(meeting.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// Helper to use cn in this file
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
