import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalUnvotedPolls } from '@/hooks/useGlobalUnvotedPolls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, Clock, X, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const POPUP_DISMISSED_KEY = 'poll_reminder_dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const PollReminderPopup = () => {
  const { user } = useAuth();
  const { unvotedPolls, loading, hasUnvotedPolls } = useGlobalUnvotedPolls();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !hasUnvotedPolls) return;

    // Check if popup was recently dismissed
    const dismissedAt = localStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return; // Still within dismiss period
      }
    }

    // Show popup after a short delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, user, hasUnvotedPolls]);

  const handleDismiss = () => {
    localStorage.setItem(POPUP_DISMISSED_KEY, Date.now().toString());
    setIsOpen(false);
  };

  const handleGoToPolls = (pollId?: string) => {
    handleDismiss();
    if (pollId) {
      navigate(`/polls/${pollId}`);
    } else {
      // Navigate to messages where polls can be accessed
      navigate('/dashboard');
    }
  };

  if (!user || !hasUnvotedPolls) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Vote className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">You Have Polls to Complete!</DialogTitle>
              <DialogDescription className="mt-1">
                {unvotedPolls.length} poll{unvotedPolls.length !== 1 ? 's' : ''} waiting for your vote
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 my-4 max-h-64 overflow-y-auto">
          {unvotedPolls.slice(0, 5).map((poll) => (
            <div
              key={poll.id}
              className="p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted/70 transition-colors cursor-pointer"
              onClick={() => handleGoToPolls(poll.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{poll.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      {poll.group_name}
                    </Badge>
                    {poll.expires_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0">
                  Vote
                </Button>
              </div>
            </div>
          ))}
          {unvotedPolls.length > 5 && (
            <p className="text-sm text-muted-foreground text-center">
              +{unvotedPolls.length - 5} more poll{unvotedPolls.length - 5 !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDismiss} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Remind Me Later
          </Button>
          <Button onClick={() => handleGoToPolls()} className="w-full sm:w-auto">
            <Vote className="h-4 w-4 mr-2" />
            Go to Polls
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
