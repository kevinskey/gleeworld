import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BarChart3, CheckCircle2, Clock, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
  has_user_voted: boolean;
}

interface Poll {
  id: string;
  question: string;
  is_closed: boolean;
  is_anonymous: boolean;
  allow_multiple_selections: boolean;
  expires_at: string | null;
  created_by: string;
  options: PollOption[];
  total_votes: number;
  user_has_voted: boolean;
}

export default function PollViewPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isVoting, setIsVoting] = useState(false);

  const fetchPoll = async () => {
    if (!pollId || !user) return;

    try {
      // Fetch poll data
      const { data: pollData, error: pollError } = await supabase
        .from('gw_polls')
        .select('*')
        .eq('id', pollId)
        .maybeSingle();

      if (pollError) throw pollError;
      if (!pollData) {
        setError('Poll not found');
        setLoading(false);
        return;
      }

      // Fetch options
      const { data: optionsData, error: optionsError } = await supabase
        .from('gw_poll_options')
        .select('*')
        .eq('poll_id', pollId)
        .order('option_order');

      if (optionsError) throw optionsError;

      // Fetch votes for this poll
      const { data: votesData } = await supabase
        .from('gw_poll_votes')
        .select('option_id, user_id')
        .eq('poll_id', pollId);

      const votes = votesData || [];
      const userVotes = votes.filter(v => v.user_id === user.id);
      const userHasVoted = userVotes.length > 0;

      // Calculate vote counts and user votes per option
      const optionsWithVotes: PollOption[] = (optionsData || []).map(opt => ({
        id: opt.id,
        option_text: opt.option_text,
        vote_count: votes.filter(v => v.option_id === opt.id).length,
        has_user_voted: userVotes.some(v => v.option_id === opt.id)
      }));

      const totalVotes = votes.length;

      setPoll({
        id: pollData.id,
        question: pollData.question,
        is_closed: pollData.is_closed || false,
        is_anonymous: pollData.is_anonymous || false,
        allow_multiple_selections: pollData.allow_multiple_selections || false,
        expires_at: pollData.expires_at,
        created_by: pollData.created_by,
        options: optionsWithVotes,
        total_votes: totalVotes,
        user_has_voted: userHasVoted
      });
    } catch (err) {
      console.error('Error fetching poll:', err);
      setError('Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [pollId, user]);

  const handleVote = async () => {
    if (!poll || selectedOptions.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one option',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsVoting(true);

      // Delete existing votes if changing vote
      await supabase
        .from('gw_poll_votes')
        .delete()
        .eq('poll_id', poll.id)
        .eq('user_id', user?.id);

      // Insert new votes
      const votesToInsert = selectedOptions.map(optionId => ({
        poll_id: poll.id,
        option_id: optionId,
        user_id: user?.id
      }));

      const { error } = await supabase
        .from('gw_poll_votes')
        .insert(votesToInsert);

      if (error) throw error;

      toast({
        title: 'Vote Recorded!',
        description: 'Your vote has been submitted successfully'
      });

      setSelectedOptions([]);
      fetchPoll(); // Refresh to show results
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sign In Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Please sign in to view and vote on this poll.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <BarChart3 className="h-5 w-5" />
              Poll Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error || 'This poll may have been deleted or the link is invalid.'}
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const canVote = !poll.is_closed && !isExpired && !poll.user_has_voted;
  const showResults = poll.user_has_voted || poll.is_closed || isExpired;

  const getPercentage = (voteCount: number) => {
    if (poll.total_votes === 0) return 0;
    return Math.round((voteCount / poll.total_votes) * 100);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button 
          onClick={() => navigate(-1)} 
          variant="ghost" 
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Poll
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Poll Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">{poll.question}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
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
                {canVote && (
                  <Badge variant="destructive" className="ml-2 animate-pulse">
                    Vote Now!
                  </Badge>
                )}
                {poll.user_has_voted && (
                  <Badge variant="secondary" className="ml-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Voted
                  </Badge>
                )}
              </div>
            </div>

            {/* Poll Options */}
            <div className="space-y-3">
              {showResults ? (
                // Show results
                poll.options.map((option) => {
                  const percentage = getPercentage(option.vote_count);
                  const hasVoted = option.has_user_voted;

                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "relative p-4 rounded-lg border transition-colors",
                        hasVoted
                          ? "bg-primary/10 border-primary/30"
                          : "bg-background border-border"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <div className="flex items-center gap-2">
                          {hasVoted && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-medium">{option.option_text}</span>
                        </div>
                        <span className="font-semibold text-primary">
                          {percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="h-2" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {option.vote_count}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show voting interface
                <>
                  {poll.allow_multiple_selections ? (
                    <div className="space-y-2">
                      {poll.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            if (selectedOptions.includes(option.id)) {
                              setSelectedOptions(selectedOptions.filter(id => id !== option.id));
                            } else {
                              setSelectedOptions([...selectedOptions, option.id]);
                            }
                          }}
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
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                            {option.option_text}
                          </Label>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground mt-2">
                        Select all that apply
                      </p>
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedOptions[0] || ''}
                      onValueChange={(value) => setSelectedOptions([value])}
                    >
                      {poll.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedOptions([option.id])}
                        >
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                            {option.option_text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  <Button
                    onClick={handleVote}
                    disabled={isVoting || selectedOptions.length === 0}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {isVoting ? 'Submitting...' : 'Submit Vote'}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
