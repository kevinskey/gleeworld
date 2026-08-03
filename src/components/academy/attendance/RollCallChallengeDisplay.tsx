import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  ROLL_CALL_SYMBOLS, parseSchedule, symbolIndexAt,
  secondsRemainingInSlot, clockOffsetMs,
} from './rollCallChallenge';

interface RollCallChallengeDisplayProps {
  sessionId: string;
}

export const RollCallChallengeDisplay: React.FC<RollCallChallengeDisplayProps> = ({ sessionId }) => {
  // One fetch; after that the display rotates locally and survives network loss.
  const { data: schedule, isLoading, refetch } = useQuery({
    queryKey: ['roll-call-schedule', sessionId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc('get_roll_call_schedule' as any, {
        p_session_id: sessionId,
      });
      if (error) throw error;
      return parseSchedule(data);
    },
    staleTime: Infinity,
    retry: 3,
  });

  const offsetRef = React.useRef(0);
  React.useEffect(() => {
    if (schedule?.serverNow) offsetRef.current = clockOffsetMs(schedule.serverNow, Date.now());
  }, [schedule]);

  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Re-sync after tab was backgrounded (setInterval throttling).
  React.useEffect(() => {
    const onVisible = () => { if (!document.hidden) refetch(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetch]);

  if (isLoading) return <LoadingSpinner text="Loading challenge..." />;
  if (!schedule) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Could not load the challenge. Check your connection and reopen this panel.
        </CardContent>
      </Card>
    );
  }

  const corrected = nowMs + offsetRef.current;
  const symbolIndex = symbolIndexAt(schedule, corrected);
  const remaining = secondsRemainingInSlot(corrected);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-center">Tap this symbol on your device</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 py-8">
        {symbolIndex === null ? (
          <p className="text-muted-foreground text-sm">Roll call window has ended.</p>
        ) : (
          <>
            <div className="text-[9rem] leading-none select-none" role="img" aria-label="Current roll call symbol">
              {ROLL_CALL_SYMBOLS[symbolIndex]}
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              Changes in {remaining}s
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
