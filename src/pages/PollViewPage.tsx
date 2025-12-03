import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PollBubble } from '@/components/messaging/PollBubble';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export default function PollViewPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pollMessage, setPollMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPollMessage = async () => {
      if (!pollId) {
        setError('No poll ID provided');
        setLoading(false);
        return;
      }

      try {
        // First try to find the poll in gw_polls table
        const { data: poll, error: pollError } = await supabase
          .from('gw_polls')
          .select('*, message_id')
          .eq('id', pollId)
          .single();

        if (pollError) {
          // If not found in gw_polls, try finding by message_id
          const { data: message, error: messageError } = await supabase
            .from('gw_group_messages')
            .select('*')
            .eq('id', pollId)
            .eq('message_type', 'poll')
            .single();

          if (messageError) {
            setError('Poll not found');
            setLoading(false);
            return;
          }

          setPollMessage(message);
        } else if (poll?.message_id) {
          // Found poll, get the associated message
          const { data: message } = await supabase
            .from('gw_group_messages')
            .select('*')
            .eq('id', poll.message_id)
            .single();

          setPollMessage(message || { id: pollId, user_id: poll.created_by, created_at: poll.created_at });
        } else {
          // Use poll data directly
          setPollMessage({ id: pollId, user_id: poll?.created_by, created_at: poll?.created_at });
        }
      } catch (err) {
        console.error('Error fetching poll:', err);
        setError('Failed to load poll');
      } finally {
        setLoading(false);
      }
    };

    fetchPollMessage();
  }, [pollId]);

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

  if (error || !pollMessage) {
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
            <PollBubble
              messageId={pollMessage.id}
              createdBy={pollMessage.user_id}
              createdAt={pollMessage.created_at}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
