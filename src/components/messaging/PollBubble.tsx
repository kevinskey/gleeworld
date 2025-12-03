import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart3, CheckCircle2, Clock, Lock, Link2 } from 'lucide-react';
import { usePoll } from '@/hooks/usePoll';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PollBubbleProps {
  messageId: string;
  createdBy: string;
  createdAt: string;
}

export const PollBubble: React.FC<PollBubbleProps> = ({
  messageId,
  createdBy,
  createdAt
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { poll, loading, vote, closePoll } = usePoll(messageId);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isVoting, setIsVoting] = useState(false);

  if (loading || !poll) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const canVote = !poll.is_closed && !isExpired && user?.id !== createdBy;
  const showResults = poll.user_has_voted || poll.is_closed || isExpired || user?.id === createdBy;
  const isCreator = user?.id === createdBy;
  const needsVote = canVote && !poll.user_has_voted;

  const handleVote = async () => {
    if (selectedOptions.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one option',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsVoting(true);
      await vote(poll.id, selectedOptions);
      toast({
        title: 'Vote Recorded',
        description: 'Your vote has been submitted successfully'
      });
      setSelectedOptions([]);
    } catch (error: any) {
      toast({
        title: 'Vote Failed',
        description: error.message || 'Failed to record your vote',
        variant: 'destructive'
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleClosePoll = async () => {
    try {
      await closePoll(poll.id);
      toast({
        title: 'Poll Closed',
        description: 'The poll has been closed successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to close poll',
        variant: 'destructive'
      });
    }
  };

  const getPercentage = (voteCount: number) => {
    if (poll.total_votes === 0) return 0;
    return Math.round((voteCount / poll.total_votes) * 100);
  };

  return (
    <Card className={cn(
      "p-4 bg-gradient-to-br from-[hsl(var(--message-header))]/5 to-[hsl(var(--message-header))]/10 border-[hsl(var(--message-header))]/20 transition-all",
      needsVote && "ring-2 ring-red-500/50 shadow-lg shadow-red-500/20 animate-pulse"
    )}>
      {/* Poll Header */}
      <div className="flex items-start gap-2 mb-3">
        <div className={cn(
          "p-2 rounded-lg bg-[hsl(var(--message-header))]/10",
          needsVote && "bg-red-500/20"
        )}>
          <BarChart3 className={cn(
            "h-4 w-4 text-[hsl(var(--message-header))]",
            needsVote && "text-red-500"
          )} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm mb-1">{poll.question}</h4>
            {needsVote && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                Vote Needed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
            {poll.expires_at && !poll.is_closed && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {isExpired
                      ? 'Expired'
                      : `Closes ${formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}`
                    }
                  </span>
                </div>
              </>
            )}
            {poll.is_closed && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>Closed</span>
                </div>
              </>
            )}
            {poll.is_anonymous && (
              <>
                <span>•</span>
                <span>Anonymous</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Poll Options */}
      <div className="space-y-2">
        {showResults ? (
          // Show results
          poll.options.map((option) => {
            const percentage = getPercentage(option.vote_count || 0);
            const hasVoted = option.has_user_voted;

            return (
              <div
                key={option.id}
                className={cn(
                  "relative p-3 rounded-lg border transition-colors",
                  hasVoted
                    ? "bg-[hsl(var(--message-header))]/10 border-[hsl(var(--message-header))]/30"
                    : "bg-background border-border"
                )}
              >
                <div className="flex items-center justify-between mb-1.5 relative z-10">
                  <div className="flex items-center gap-2">
                    {hasVoted && (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--message-header))]" />
                    )}
                    <span className="text-sm font-medium">{option.option_text}</span>
                  </div>
                  <span className="text-sm font-semibold text-[hsl(var(--message-header))]">
                    {percentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={percentage} className="h-2" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {option.vote_count || 0}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          // Show voting interface
          <>
            {poll.allow_multiple_selections ? (
              // Multiple choice
              <div className="space-y-2">
                {poll.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={option.id}
                      checked={selectedOptions.includes(option.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOptions([...selectedOptions, option.id]);
                        } else {
                          setSelectedOptions(selectedOptions.filter(id => id !== option.id));
                        }
                      }}
                    />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm">
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              // Single choice
              <RadioGroup
                value={selectedOptions[0] || ''}
                onValueChange={(value) => setSelectedOptions([value])}
              >
                {poll.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm">
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        {canVote && !showResults && (
          <Button
            onClick={handleVote}
            disabled={isVoting || selectedOptions.length === 0}
            size="sm"
            className="bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90"
          >
            {isVoting ? 'Voting...' : 'Submit Vote'}
          </Button>
        )}
        {isCreator && !poll.is_closed && !isExpired && (
          <Button
            onClick={handleClosePoll}
            variant="outline"
            size="sm"
          >
            Close Poll
          </Button>
        )}
        <Button
          onClick={() => {
            const pollLink = `https://gleeworld.org/polls/${poll.id}`;
            navigator.clipboard.writeText(pollLink);
            toast({
              title: 'Link Copied',
              description: 'Poll link copied to clipboard'
            });
          }}
          variant="ghost"
          size="sm"
          className="ml-auto"
        >
          <Link2 className="h-4 w-4 mr-1" />
          Copy Link
        </Button>
        {poll.allow_multiple_selections && !showResults && (
          <span className="text-xs text-muted-foreground">
            Select multiple options
          </span>
        )}
      </div>
    </Card>
  );
};
