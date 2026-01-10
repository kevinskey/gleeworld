import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Video, Plus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQueryClient } from '@tanstack/react-query';
import { MeetingWithNotes } from './MeetingWithNotes';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { ScheduledMeetingsList } from './ScheduledMeetingsList';
import { MeetingWaitingRoom } from './MeetingWaitingRoom';
import { MeetingNotesHistory } from './MeetingNotesHistory';
import { ActiveMeetingsList } from './ActiveMeetingsList';
import { supabase } from '@/integrations/supabase/client';
interface VideoSessionManagerProps {
  className?: string;
  joinRoomName?: string | null;
}

export const VideoSessionManager: React.FC<VideoSessionManagerProps> = ({
  className,
  joinRoomName
}) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const queryClient = useQueryClient();
  const [roomName, setRoomName] = useState('');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showQuickRoomsDialog, setShowQuickRoomsDialog] = useState(false);

  // Handle auto-join from URL parameter
  useEffect(() => {
    if (joinRoomName) {
      handleJoinFromLink(joinRoomName);
    }
  }, [joinRoomName]);

  const handleJoinFromLink = async (room: string) => {
    try {
      // Check if this is a scheduled meeting
      const { data: meeting } = await supabase
        .from('scheduled_meetings')
        .select('scheduled_at, status')
        .eq('room_name', room)
        .maybeSingle();

      if (meeting) {
        const scheduledTime = new Date(meeting.scheduled_at);
        const now = new Date();
        
        // If meeting hasn't started yet (more than 5 min before scheduled time), show waiting room
        const fiveMinutesBefore = new Date(scheduledTime.getTime() - 5 * 60 * 1000);
        if (now < fiveMinutesBefore) {
          setActiveRoom(room);
          setIsInWaitingRoom(true);
          return;
        }
      }

      // Otherwise, join directly
      setActiveRoom(room);
      setIsInMeeting(true);
    } catch (error) {
      console.error('Error checking meeting status:', error);
      // On error, just join the meeting
      setActiveRoom(room);
      setIsInMeeting(true);
    }
  };

  const handleJoinScheduledMeeting = (scheduledRoomName: string) => {
    setActiveRoom(scheduledRoomName);
    setIsInMeeting(true);
  };

  const handleMeetingScheduled = () => {
    queryClient.invalidateQueries({
      queryKey: ['scheduled-meetings']
    });
  };

  const handleStartMeeting = () => {
    if (!roomName.trim()) return;
    const sanitizedRoom = roomName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setActiveRoom(sanitizedRoom);
    setIsInMeeting(true);
    setShowJoinDialog(false);
  };

  const handleJoinQuickMeeting = () => {
    const quickRoom = `glee-meeting-${Date.now().toString(36)}`;
    setActiveRoom(quickRoom);
    setIsInMeeting(true);
  };

  const handleLeaveMeeting = () => {
    setIsInMeeting(false);
    setIsInWaitingRoom(false);
    setActiveRoom(null);
    setRoomName('');
  };

  const handleWaitingRoomStart = () => {
    setIsInWaitingRoom(false);
    setIsInMeeting(true);
  };

  const handleLeaveWaitingRoom = () => {
    setIsInWaitingRoom(false);
    setActiveRoom(null);
  };

  // Show waiting room
  if (isInWaitingRoom && activeRoom) {
    return (
      <div className={`w-full ${className}`}>
        <MeetingWaitingRoom
          roomName={activeRoom}
          onMeetingStart={handleWaitingRoomStart}
          onCancel={handleLeaveWaitingRoom}
        />
      </div>
    );
  }

  if (isInMeeting && activeRoom) {
    return (
      <div className={`w-full h-[600px] ${className}`}>
        <MeetingWithNotes
          roomName={activeRoom}
          userName={userProfile?.full_name || userProfile?.display_name || user?.email || 'Guest'}
          userEmail={user?.email}
          userId={user?.id}
          isModerator={userProfile?.is_admin || userProfile?.is_super_admin || false}
          onClose={handleLeaveMeeting}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Main Actions Grid - Zoom Style */}
      <div className="grid grid-cols-2 gap-6 max-w-md mx-auto pt-4">
        {/* New Meeting */}
        <button
          onClick={handleJoinQuickMeeting}
          className="flex flex-col items-center gap-3 group"
        >
          <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <Video className="h-10 w-10 text-white" />
          </div>
          <span className="text-base font-medium text-foreground">New meeting</span>
        </button>

        {/* Join */}
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogTrigger asChild>
            <button className="flex flex-col items-center gap-3 group">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <Plus className="h-10 w-10 text-primary-foreground" />
              </div>
              <span className="text-base font-medium text-foreground">Join</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Meeting</DialogTitle>
              <DialogDescription>
                Enter a room name to join an existing meeting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  placeholder="e.g., rehearsal-room, soprano-section"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStartMeeting()}
                />
              </div>
              <Button onClick={handleStartMeeting} disabled={!roomName.trim()} className="w-full">
                <Video className="h-4 w-4 mr-2" />
                Join Meeting
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Schedule */}
        <ScheduleMeetingDialog onMeetingScheduled={handleMeetingScheduled} />

        {/* Quick Rooms */}
        <Dialog open={showQuickRoomsDialog} onOpenChange={setShowQuickRoomsDialog}>
          <DialogTrigger asChild>
            <button className="flex flex-col items-center gap-3 group">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <Users className="h-10 w-10 text-primary-foreground" />
              </div>
              <span className="text-base font-medium text-foreground">Quick rooms</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quick Rooms</DialogTitle>
              <DialogDescription>
                Join a preset room for your section or purpose.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-4">
              {['director-office', 'soprano-section', 'alto-section', 'rehearsal-room', 'exec-board'].map(room => (
                <Button
                  key={room}
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setActiveRoom(room);
                    setIsInMeeting(true);
                    setShowQuickRoomsDialog(false);
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  {room}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Meetings - Live Sessions */}
      <ActiveMeetingsList 
        onJoinMeeting={handleJoinScheduledMeeting} 
        className="max-w-2xl mx-auto"
      />

      {/* Scheduled Meetings */}
      <ScheduledMeetingsList onJoinMeeting={handleJoinScheduledMeeting} />

      {/* Past Meeting Notes */}
      <MeetingNotesHistory className="max-w-2xl mx-auto" />
    </div>
  );
};

export default VideoSessionManager;
