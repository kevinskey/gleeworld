import React from 'react';
import { useActiveMeeting } from '@/contexts/ActiveMeetingContext';
import { MeetingWithNotes } from './MeetingWithNotes';
import { Button } from '@/components/ui/button';
import { Minimize2, Maximize2, X, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PersistentMeetingOverlay: React.FC = () => {
  const { activeMeeting, isMinimized, endMeeting, toggleMinimize } = useActiveMeeting();

  if (!activeMeeting) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[60] bg-primary text-primary-foreground rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
        onClick={toggleMinimize}
      >
        <Video className="h-5 w-5 animate-pulse" />
        <span className="text-sm font-medium">Meeting in progress</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-white/20" onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}>
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-destructive/80" onClick={(e) => { e.stopPropagation(); endMeeting(); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[55] bg-background flex flex-col" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)' }}>
      {/* Top bar */}
      <div className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <span className="font-semibold text-sm">Meeting: {activeMeeting.roomName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={toggleMinimize}>
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-destructive/80" onClick={endMeeting}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Meeting content */}
      <div className="flex-1 min-h-0">
        <MeetingWithNotes
          roomName={activeMeeting.roomName}
          userName={activeMeeting.userName}
          userEmail={activeMeeting.userEmail}
          userId={activeMeeting.userId}
          isModerator={activeMeeting.isModerator}
          onClose={endMeeting}
        />
      </div>
    </div>
  );
};
