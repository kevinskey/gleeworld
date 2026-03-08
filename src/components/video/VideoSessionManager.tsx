import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Video, Plus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQueryClient } from '@tanstack/react-query';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { ScheduledMeetingsList } from './ScheduledMeetingsList';
import { MeetingNotesHistory } from './MeetingNotesHistory';
import { ActiveMeetingsList } from './ActiveMeetingsList';
import { useActiveMeeting } from '@/contexts/ActiveMeetingContext';
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
  const { activeMeeting, startMeeting, setMinimized } = useActiveMeeting();
  const [roomName, setRoomName] = useState('');
  const [newMeetingName, setNewMeetingName] = useState('');
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showQuickRoomsDialog, setShowQuickRoomsDialog] = useState(false);

  const getUserName = () => userProfile?.full_name || userProfile?.display_name || user?.email || 'Guest';

  // Handle auto-join from URL parameter
  useEffect(() => {
    if (joinRoomName && joinRoomName !== activeMeeting?.roomName) {
      launchMeeting(joinRoomName);
    }
  }, [joinRoomName]);

  const launchMeeting = (room: string) => {
    startMeeting({
      roomName: room,
      userName: getUserName(),
      userEmail: user?.email,
      userId: user?.id,
      isModerator: userProfile?.is_admin || userProfile?.is_super_admin || false,
    });
  };

  const handleJoinScheduledMeeting = (scheduledRoomName: string) => {
    launchMeeting(scheduledRoomName);
  };

  const handleMeetingScheduled = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduled-meetings'] });
  };

  const handleStartMeeting = () => {
    if (!roomName.trim()) return;
    const sanitizedRoom = roomName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    launchMeeting(sanitizedRoom);
    setShowJoinDialog(false);
  };

  const handleJoinQuickMeeting = () => {
    const quickRoom = `glee-meeting-${Date.now().toString(36)}`;
    launchMeeting(quickRoom);
  };

  // If there's an active meeting, show a "return to meeting" banner instead
  if (activeMeeting) {
    return (
      <div className={`space-y-8 ${className}`}>
        <div className="flex flex-col items-center gap-4 pt-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Video className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <p className="text-lg font-semibold">You're in a meeting</p>
          <p className="text-sm text-muted-foreground">Room: {activeMeeting.roomName}</p>
          <Button onClick={() => setMinimized(false)} className="gap-2">
            <Video className="h-4 w-4" />
            Return to Meeting
          </Button>
        </div>

        <ScheduledMeetingsList onJoinMeeting={handleJoinScheduledMeeting} />
        <MeetingNotesHistory className="max-w-2xl mx-auto" />
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Main Actions Grid */}
      <div className="grid grid-cols-2 gap-6 max-w-md mx-auto pt-4">
        <button onClick={handleJoinQuickMeeting} className="flex flex-col items-center gap-3 group">
          <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <Video className="h-10 w-10 text-white" />
          </div>
          <span className="text-base font-medium text-foreground">New meeting</span>
        </button>

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
              <DialogDescription>Enter a room name to join an existing meeting.</DialogDescription>
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

        <ScheduleMeetingDialog onMeetingScheduled={handleMeetingScheduled} />

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
              <DialogDescription>Join a preset room for your section or purpose.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-4">
              {['director-office', 'soprano-section', 'alto-section', 'rehearsal-room', 'exec-board'].map(room => (
                <Button
                  key={room}
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    launchMeeting(room);
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

      <ActiveMeetingsList onJoinMeeting={handleJoinScheduledMeeting} className="max-w-2xl mx-auto" />
      <ScheduledMeetingsList onJoinMeeting={handleJoinScheduledMeeting} />
      <MeetingNotesHistory className="max-w-2xl mx-auto" />
    </div>
  );
};

export default VideoSessionManager;
