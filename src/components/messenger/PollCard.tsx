// Inline poll display. Fetches options + votes, lets user tap to vote/unvote,
// shows live counts. Uses existing gw_polls + gw_poll_options + gw_poll_votes.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, BarChart3 } from 'lucide-react';

export function PollCard({ messageId }: { messageId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: poll } = useQuery({
    queryKey: ['poll', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_polls')
        .select(`
          id, question, allow_multiple_selections, is_closed,
          options:gw_poll_options(id, option_text, display_order),
          votes:gw_poll_votes(option_id, user_id)
        `)
        .eq('message_id', messageId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!poll) return null;

  const options = (poll.options ?? []).slice().sort((a: any, b: any) => a.display_order - b.display_order);
  const totalVotes = poll.votes?.length ?? 0;

  async function vote(optionId: string, alreadyVoted: boolean) {
    if (!user || poll.is_closed) return;
    if (alreadyVoted) {
      await supabase.from('gw_poll_votes').delete()
        .eq('poll_id', poll.id).eq('option_id', optionId).eq('user_id', user.id);
    } else {
      if (!poll.allow_multiple_selections) {
        // Single choice: remove other votes first.
        await supabase.from('gw_poll_votes').delete()
          .eq('poll_id', poll.id).eq('user_id', user.id);
      }
      await supabase.from('gw_poll_votes').insert({
        poll_id: poll.id, option_id: optionId, user_id: user.id,
      });
    }
    qc.invalidateQueries({ queryKey: ['poll', messageId] });
  }

  return (
    <Card className="w-80 max-w-full">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="w-3 h-3" />
          {poll.is_closed ? 'Poll closed' : poll.allow_multiple_selections ? 'Multiple choice' : 'Single choice'}
        </div>
        <div className="font-semibold text-sm">{poll.question}</div>
        <div className="space-y-1">
          {options.map((opt: any) => {
            const optVotes = poll.votes?.filter((v: any) => v.option_id === opt.id) ?? [];
            const myVote = optVotes.some((v: any) => v.user_id === user?.id);
            const pct = totalVotes > 0 ? Math.round((optVotes.length / totalVotes) * 100) : 0;
            return (
              <button
                key={opt.id}
                onClick={() => vote(opt.id, myVote)}
                disabled={poll.is_closed}
                className={`relative w-full text-left p-2 rounded border text-sm overflow-hidden ${
                  myVote ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                } ${poll.is_closed ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="absolute inset-0 bg-primary/10" style={{ width: `${pct}%` }} />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {myVote && <CheckCircle2 className="w-3 h-3 text-primary" />}
                    {opt.option_text}
                  </span>
                  <span className="text-xs text-muted-foreground">{optVotes.length} ({pct}%)</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground text-right">{totalVotes} vote{totalVotes === 1 ? '' : 's'}</div>
      </CardContent>
    </Card>
  );
}
