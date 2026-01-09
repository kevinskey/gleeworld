import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Video, Plus, Users, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { JitsiMeetRoom } from './JitsiMeetRoom';

interface VideoSessionManagerProps {
  className?: string;
}

export const VideoSessionManager: React.FC<VideoSessionManagerProps> = ({ className }) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [roomName, setRoomName] = useState('');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleStartMeeting = () => {
    if (!roomName.trim()) return;
    
    // Sanitize room name - replace spaces with dashes, remove special chars
    const sanitizedRoom = roomName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    setActiveRoom(sanitizedRoom);
    setIsInMeeting(true);
    setShowCreateDialog(false);
  };

  const handleJoinQuickMeeting = () => {
    // Generate a quick meeting room name
    const quickRoom = `glee-meeting-${Date.now().toString(36)}`;
    setActiveRoom(quickRoom);
    setIsInMeeting(true);
  };

  const handleLeaveMeeting = () => {
    setIsInMeeting(false);
    setActiveRoom(null);
    setRoomName('');
  };

  if (isInMeeting && activeRoom) {
    return (
      <div className={`w-full h-[600px] ${className}`}>
      <JitsiMeetRoom
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
    <div className={`space-y-6 ${className}`}>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleJoinQuickMeeting}>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Start Instant Meeting</h3>
            <p className="text-sm text-muted-foreground">Start a video call right now</p>
          </CardContent>
        </Card>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Create Named Room</h3>
                <p className="text-sm text-muted-foreground">Create a room with a custom name</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Video Room</DialogTitle>
              <DialogDescription>
                Enter a name for your meeting room. Share this name with others to join.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  placeholder="e.g., rehearsal-room, soprano-section"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartMeeting()}
                />
                <p className="text-xs text-muted-foreground">
                  Room names are converted to lowercase with dashes
                </p>
              </div>
              <Button onClick={handleStartMeeting} disabled={!roomName.trim()} className="w-full">
                <Video className="h-4 w-4 mr-2" />
                Start Meeting
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Join Existing Room */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join Existing Room
          </CardTitle>
          <CardDescription>
            Enter a room name to join an existing meeting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter room name..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartMeeting()}
            />
            <Button onClick={handleStartMeeting} disabled={!roomName.trim()}>
              Join
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Rooms - placeholder for future */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['director-office', 'soprano-section', 'alto-section', 'rehearsal-room', 'exec-board'].map((room) => (
              <Button
                key={room}
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => {
                  setActiveRoom(room);
                  setIsInMeeting(true);
                }}
              >
                <Video className="h-3 w-3 mr-2" />
                {room}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoSessionManager;
