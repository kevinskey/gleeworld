import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Video, Users, Loader2 } from 'lucide-react';
import { useActiveMeetings } from '@/hooks/useActiveMeetings';
import { useNavigate } from 'react-router-dom';

export const ActiveMeetingsSidebar: React.FC = () => {
  const { activeMeetings, isLoading, error } = useActiveMeetings();
  const navigate = useNavigate();

  const handleJoinMeeting = (roomName: string) => {
    navigate(`/messenger?join=${encodeURIComponent(roomName)}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${activeMeetings.length > 0 ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
          Live Meetings
          {activeMeetings.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {activeMeetings.length} active
            </span>
          )}
        </h3>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-xs text-muted-foreground text-center py-4">{error}</p>
          ) : activeMeetings.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Video className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                No active meetings
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Start or join a meeting to see it here
              </p>
            </div>
          ) : (
            activeMeetings.map((meeting) => {
              const displayName = meeting.room_name
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());

              return (
                <div
                  key={meeting.room_name}
                  className="p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Video className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{displayName}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{meeting.participants.length} in session</span>
                      </div>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex -space-x-1.5">
                      {meeting.participants.slice(0, 4).map((p, idx) => (
                        <Avatar key={p.user_id || idx} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[9px] bg-primary/80 text-primary-foreground">
                            {p.user_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {meeting.participants.length > 4 && (
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[9px] bg-muted">
                            +{meeting.participants.length - 4}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>

                  <Button 
                    size="sm" 
                    className="w-full h-7 text-xs"
                    onClick={() => handleJoinMeeting(meeting.room_name)}
                  >
                    Join Meeting
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ActiveMeetingsSidebar;
