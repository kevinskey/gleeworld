// /practice/log — student-facing practice log. Quick form + streak + history.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Timer, Flame, Trash2 } from 'lucide-react';

export default function PracticeLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [minutes, setMinutes] = useState('20');
  const [what, setWhat] = useState('');
  const [reflection, setReflection] = useState('');

  const { data: logs = [] } = useQuery({
    queryKey: ['my-practice-logs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('gw_practice_logs')
        .select('*')
        .eq('student_user_id', user.id)
        .order('practice_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const streak = computeStreak(logs);
  const weekTotal = logs
    .filter((l: any) => withinDays(l.practice_date, 7))
    .reduce((sum: number, l: any) => sum + (l.minutes || 0), 0);

  const log = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('gw_practice_logs').insert({
        student_user_id: user.id,
        minutes: parseInt(minutes),
        what_practiced: what || null,
        reflection: reflection || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setWhat(''); setReflection('');
      qc.invalidateQueries({ queryKey: ['my-practice-logs', user?.id] });
      toast({ title: 'Practice logged' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_practice_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-practice-logs', user?.id] }),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Timer className="w-6 h-6 text-primary" /> Practice Log
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Streak</div>
            <div className="text-3xl font-bold flex items-center gap-2"><Flame className="w-7 h-7 text-orange-500" />{streak}d</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">This week</div>
            <div className="text-3xl font-bold">{weekTotal}<span className="text-base font-normal text-muted-foreground"> min</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Log practice</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Minutes</Label>
            <Input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="max-w-[120px]" />
          </div>
          <div>
            <Label className="text-xs">What did you practice?</Label>
            <Input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Scales, mm. 30–60 of the Mozart" />
          </div>
          <div>
            <Label className="text-xs">Reflection (optional)</Label>
            <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What went well? What needs more time?" />
          </div>
          <Button onClick={() => log.mutate()} disabled={!minutes || parseInt(minutes) < 1 || log.isPending}>
            Log it
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
          {logs.map((l: any) => (
            <div key={l.id} className="border rounded p-3 text-sm flex items-start justify-between">
              <div>
                <div className="font-semibold">{l.minutes} min · {new Date(l.practice_date).toLocaleDateString()}</div>
                {l.what_practiced && <div className="text-muted-foreground">{l.what_practiced}</div>}
                {l.reflection && <div className="text-xs text-muted-foreground italic mt-1">"{l.reflection}"</div>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => del.mutate(l.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function withinDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

function computeStreak(logs: any[]): number {
  if (logs.length === 0) return 0;
  const dates = new Set(logs.map((l) => l.practice_date));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
