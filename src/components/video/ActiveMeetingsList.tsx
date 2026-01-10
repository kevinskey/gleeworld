import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Video, Users, Loader2 } from 'lucide-react';
import { useActiveMeetings, ActiveMeeting } from '@/hooks/useActiveMeetings';

interface ActiveMeetingsListProps {
  onJoinMeeting: (roomName: string) => void;
  className?: string;
}

export const ActiveMeetingsList: React.FC<ActiveMeetingsListProps> = ({
  onJoinMeeting,
  className = '',
}) => {
  const { activeMeetings, isLoading, error } = useActiveMeetings();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Active Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">Active Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (activeMeetings.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted" />
            Active Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active meetings right now
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Active Meetings
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {activeMeetings.length} in session
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeMeetings.map((meeting) => (
          <MeetingCard
            key={meeting.room_name}
            meeting={meeting}
            onJoin={() => onJoinMeeting(meeting.room_name)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

interface MeetingCardProps {
  meeting: ActiveMeeting;
  onJoin: () => void;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onJoin }) => {
  const displayName = meeting.room_name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
          <Video className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{displayName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Participant avatars */}
        <div className="flex -space-x-2">
          {meeting.participants.slice(0, 3).map((participant, idx) => (
            <Avatar key={participant.user_id || idx} className="h-7 w-7 border-2 border-background">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {participant.user_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          ))}
          {meeting.participants.length > 3 && (
            <Avatar className="h-7 w-7 border-2 border-background">
              <AvatarFallback className="text-xs bg-muted">
                +{meeting.participants.length - 3}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        
        <Button size="sm" onClick={onJoin} className="ml-2">
          Join
        </Button>
      </div>
    </div>
  );
};

export default ActiveMeetingsList;
