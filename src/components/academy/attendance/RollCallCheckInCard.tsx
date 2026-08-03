import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Clock, Lock, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ROLL_CALL_SYMBOLS, deriveCardStatus } from './rollCallChallenge';

interface RollCallCheckInCardProps {
  courseId: string;
}

export const RollCallCheckInCard: React.FC<RollCallCheckInCardProps> = ({ courseId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Open roll_call session for this course. RLS already restricts to enrolled users.
  const { data: session } = useQuery({
    queryKey: ['roll-call-open-session', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_attendance_sessions')
        .select('id, title, opens_at, closes_at, status, mode')
        .eq('course_id', courseId)
        .eq('mode', 'roll_call')
        .eq('status', 'open')
        .lte('opens_at', new Date().toISOString())
        .gte('closes_at', new Date().toISOString())
        .order('opens_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!courseId && !!user?.id,
    refetchInterval: 10_000, // polling fallback — realtime alone is not trusted
  });

  const { data: myState } = useQuery({
    queryKey: ['roll-call-my-state', session?.id, user?.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc('get_my_roll_call_state' as any, {
        p_session_id: session!.id,
      });
      if (error) throw error;
      return data as { checked_in: boolean; status: string | null; marked_at: string | null; wrong_attempts: number; locked: boolean };
    },
    enabled: !!session?.id && !!user?.id,
    refetchInterval: 10_000,
  });

  // Realtime nudge for session open/close.
  React.useEffect(() => {
    if (!courseId) return;
    const channel = supabase
      .channel(`roll-call-student-${courseId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gw_attendance_sessions', filter: `course_id=eq.${courseId}` },
        () => qc.invalidateQueries({ queryKey: ['roll-call-open-session', courseId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [courseId, qc]);

  const tapMutation = useMutation({
    mutationFn: async (symbolIndex: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc('roll_call_check_in' as any, {
        p_session_id: session!.id,
        p_symbol_index: symbolIndex,
      });
      if (error) throw error;
      return data as { success: boolean; error?: string; message?: string; status?: string; locked?: boolean };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['roll-call-my-state', session?.id, user?.id] });
      if (res.success) {
        toast({ title: res.status === 'late' ? 'Checked in (late)' : 'You are checked in!' });
      } else if (res.error === 'WRONG_SYMBOL') {
        toast({ title: 'Not quite', description: res.message, variant: 'destructive' });
      } else {
        toast({ title: 'Check-in unavailable', description: res.message, variant: 'destructive' });
      }
    },
    onError: () => {
      toast({ title: 'Network problem', description: 'Could not reach the server — try again.', variant: 'destructive' });
    },
  });

  if (!session || !user) return null;
  const status = myState ? deriveCardStatus(myState) : 'ready';

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-bold text-foreground text-sm flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            {session.title}
          </p>
          {status === 'present' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" /> Present
              {myState?.marked_at && ` · ${format(new Date(myState.marked_at), 'h:mm a')}`}
            </span>
          )}
          {status === 'late' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" /> Late
              {myState?.marked_at && ` · ${format(new Date(myState.marked_at), 'h:mm a')}`}
            </span>
          )}
        </div>

        {status === 'ready' && (
          <>
            <p className="text-xs text-muted-foreground">
              Tap the symbol on the classroom screen to check in.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ROLL_CALL_SYMBOLS.map((symbol, i) => (
                <Button
                  key={symbol}
                  variant="outline"
                  className="h-14 text-2xl"
                  disabled={tapMutation.isPending}
                  onClick={() => tapMutation.mutate(i)}
                  aria-label={`Symbol ${i + 1}`}
                >
                  {symbol}
                </Button>
              ))}
            </div>
            {(myState?.wrong_attempts ?? 0) > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {myState!.wrong_attempts} missed {myState!.wrong_attempts === 1 ? 'tap' : 'taps'} — look at the screen before tapping.
              </p>
            )}
          </>
        )}

        {status === 'locked' && (
          <p className="text-xs text-destructive flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Self check-in is locked. See your instructor to be marked present.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
