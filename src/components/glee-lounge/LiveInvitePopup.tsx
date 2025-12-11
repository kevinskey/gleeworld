import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, X } from 'lucide-react';
import { useLiveInviteNotifications } from '@/hooks/useLiveInviteNotifications';
import { useNavigate } from 'react-router-dom';

export const LiveInvitePopup = () => {
  const { pendingInvites, dismissInvite, acceptInvite } = useLiveInviteNotifications();
  const navigate = useNavigate();

  if (pendingInvites.length === 0) return null;

  const latestInvite = pendingInvites[0];

  const handleJoin = async () => {
    await acceptInvite(latestInvite.id);
    // Navigate to Glee Lounge if not already there
    navigate('/glee-lounge');
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-slide-in">
      <Card className="w-80 bg-card border-2 border-red-500 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Video className="h-5 w-5 text-red-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Live Video Invite</p>
              <p className="text-sm text-muted-foreground truncate">
                {latestInvite.session_host_name} is inviting you to join their live session!
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => dismissInvite(latestInvite.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => dismissInvite(latestInvite.id)}
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleJoin}
            >
              Join Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
