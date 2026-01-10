import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { JitsiMeetRoom } from './JitsiMeetRoom';
import { MeetingNotesPanel } from './MeetingNotesPanel';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeetingNotes } from '@/hooks/useMeetingNotes';
import { useMeetingPresence } from '@/hooks/useActiveMeetings';

interface MeetingWithNotesProps {
  roomName: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  isModerator?: boolean;
  onClose?: () => void;
}

export const MeetingWithNotes: React.FC<MeetingWithNotesProps> = ({
  roomName,
  userName,
  userEmail,
  userId,
  isModerator = false,
  onClose
}) => {
  const [showNotes, setShowNotes] = useState(true);
  const { endMeeting } = useMeetingNotes(roomName);
  
  // Track presence in this meeting room
  useMeetingPresence(roomName, userName, userEmail, userId);

  const handleClose = async () => {
    await endMeeting();
    onClose?.();
  };

  return (
    <div className="flex h-full w-full gap-0 relative">
      {/* Video Section */}
      <div className={cn(
        "transition-all duration-300 ease-in-out h-full",
        showNotes ? "w-[60%]" : "w-full"
      )}>
        <JitsiMeetRoom
          roomName={roomName}
          userName={userName}
          userEmail={userEmail}
          userId={userId}
          isModerator={isModerator}
          onClose={handleClose}
        />
      </div>

      {/* Toggle Button */}
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setShowNotes(!showNotes)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-20 rounded-full shadow-lg transition-all duration-300",
          showNotes ? "right-[40%] -mr-4" : "right-2"
        )}
      >
        {showNotes ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <FileText className="h-4 w-4" />
          </>
        )}
      </Button>

      {/* Notes Panel */}
      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden border-l bg-background",
        showNotes ? "w-[40%] opacity-100" : "w-0 opacity-0"
      )}>
        {showNotes && (
          <MeetingNotesPanel 
            roomName={roomName} 
            className="h-full rounded-none border-0"
          />
        )}
      </div>
    </div>
  );
};

export default MeetingWithNotes;
