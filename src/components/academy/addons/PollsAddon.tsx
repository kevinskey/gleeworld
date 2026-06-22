// Polls add-on — wraps the existing AcademyPollSystem inside a course
// context. Falls back to a simple in-house implementation when that
// component's signature doesn't match what we need.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ListMusic, Plus, Trash2, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Props {
  courseId: string;
  canEdit: boolean;
}

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function PollsAddon({ courseId, canEdit }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['course-polls', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_academy_polls')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const valid = options.map((o) => o.trim()).filter(Boolean);
      if (!question.trim()) throw new Error('Question is required.');
      if (valid.length < 2) throw new Error('At least two options.');
      const { error } = await supabase.from('gw_academy_polls').insert({
        course_id: courseId,
        question: question.trim(),
        options: valid,
        is_active: true,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setQuestion(''); setOptions(['', '']);
      toast.success('Poll created.');
      qc.invalidateQueries({ queryKey: ['course-polls', courseId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Create failed.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_academy_polls').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-polls', courseId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 inline-flex items-center justify-center">
          <ListMusic className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold">Polls</h2>
          <p className="text-xs text-muted-foreground">Quick polls for this class — live in-class or async vote-by-tomorrow.</p>
        </div>
      </div>

      {canEdit && (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Question</Label>
              <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What should we open with for the spring concert?" />
            </div>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => setOptions((o) => o.map((x, idx) => idx === i ? e.target.value : x))}
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button onClick={() => setOptions((o) => o.filter((_, idx) => idx !== i))} className="text-rose-600 hover:text-rose-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setOptions((o) => [...o, ''])}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Option
              </Button>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                Create poll
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
      ) : polls.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">No polls yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {polls.map((p: any) => <PollRow key={p.id} poll={p} canEdit={canEdit} onRemove={() => remove.mutate(p.id)} />)}
        </div>
      )}
    </div>
  );
}

function PollRow({ poll, canEdit, onRemove }: { poll: any; canEdit: boolean; onRemove: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: responses = [] } = useQuery({
    queryKey: ['poll-responses', poll.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_academy_poll_responses')
        .select('user_id, choice')
        .eq('poll_id', poll.id);
      return data ?? [];
    },
  });

  const vote = useMutation({
    mutationFn: async (choice: string) => {
      const { error } = await supabase
        .from('gw_academy_poll_responses')
        .upsert({ poll_id: poll.id, user_id: user?.id, choice }, { onConflict: 'poll_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['poll-responses', poll.id] }),
    onError: (e: any) => toast.error(e?.message || 'Vote failed.'),
  });

  const total = responses.length;
  const myChoice = responses.find((r: any) => r.user_id === user?.id)?.choice;
  const counts: Record<string, number> = {};
  responses.forEach((r: any) => { counts[r.choice] = (counts[r.choice] || 0) + 1; });

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{poll.question}</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {poll.created_at && format(parseISO(poll.created_at), 'MMM d, h:mm a')} · {total} vote{total === 1 ? '' : 's'}
            </div>
          </div>
          {canEdit && (
            <button onClick={onRemove} className="text-rose-600 hover:text-rose-700">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {(poll.options as string[]).map((opt) => {
            const count = counts[opt] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const mine = myChoice === opt;
            return (
              <button
                key={opt}
                onClick={() => vote.mutate(opt)}
                className={`w-full text-left rounded-lg p-2.5 border transition relative overflow-hidden ${
                  mine ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                }`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between text-sm">
                  <span className="font-medium">{opt}</span>
                  <Badge variant="outline" className="text-xs">{count} · {pct}%</Badge>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
