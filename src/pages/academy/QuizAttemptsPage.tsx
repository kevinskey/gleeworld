// /academy/c/:code/test/:testId/attempts — instructor view of every
// student's attempt on a test. Click an attempt to drill into per-question
// answers, override grades, finalize.

import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck, ChevronRight, Loader2, Clock,
} from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function QuizAttemptsPage() {
  const { code, testId } = useParams<{ code: string; testId: string }>();
  const navigate = useNavigate();

  const { data: test } = useQuery({
    queryKey: ['test-attempts-meta', testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_tests')
        .select('id, title, total_points, course_id')
        .eq('id', testId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['test-attempts', testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_test_attempts')
        .select('id, user_id, started_at, submitted_at, score, max_score, is_graded, attempt_number')
        .eq('test_id', testId!)
        .order('submitted_at', { ascending: false, nullsFirst: true });
      return data ?? [];
    },
  });

  // Pull user profiles in one shot for the listed user_ids.
  const userIds = Array.from(new Set(attempts.map((a: any) => a.user_id)));
  const { data: profiles = [] } = useQuery({
    queryKey: ['test-attempt-profiles', userIds.join(',')],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      return data ?? [];
    },
  });
  const profMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  // Check which attempts have any short-answer responses that the auto-
  // grader left ungraded — those need manual review.
  const { data: pendingMap = {} } = useQuery({
    queryKey: ['test-attempts-pending', attempts.map((a: any) => a.id).join(',')],
    enabled: attempts.length > 0,
    queryFn: async () => {
      const ids = attempts.map((a: any) => a.id);
      const { data } = await supabase
        .from('gw_course_test_answers')
        .select('attempt_id, is_correct')
        .in('attempt_id', ids)
        .is('is_correct', null);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.attempt_id] = (map[r.attempt_id] || 0) + 1; });
      return map;
    },
  });

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      maxWidth="4xl"
      title={test?.title ?? 'Quiz'}
      subtitle={`${attempts.length} attempt${attempts.length === 1 ? '' : 's'}`}
    >

      {isLoading ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></CardContent>
        </Card>
      ) : attempts.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No one has taken this quiz yet.
          </CardContent>
        </Card>
      ) : (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-2 sm:p-3">
            <ul className="divide-y">
              {attempts.map((a: any) => {
                const prof: any = profMap.get(a.user_id) || {};
                const pending = (pendingMap as any)[a.id] || 0;
                const submitted = a.submitted_at ? parseISO(a.submitted_at) : null;
                const pct = a.is_graded && a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : null;
                return (
                  <li
                    key={a.id}
                    onClick={() => navigate(`/academy/c/${code}/test/${testId}/attempts/${a.id}`)}
                    className="py-3 px-2 flex items-center gap-3 hover:bg-muted/40 cursor-pointer rounded"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 inline-flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {prof.full_name || prof.email || 'Student'}
                        {a.attempt_number > 1 && <span className="text-xs text-muted-foreground ml-2">attempt #{a.attempt_number}</span>}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        {submitted ? (
                          <span>Submitted {formatDistanceToNow(submitted, { addSuffix: true })}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />In progress</span>
                        )}
                        {pending > 0 && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">{pending} to grade</Badge>}
                      </div>
                    </div>
                    {pct !== null && (
                      <div className={cn(
                        'text-right',
                        pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-600',
                      )}>
                        <div className="text-lg font-bold leading-none">{pct}%</div>
                        <div className="text-xs text-muted-foreground">{a.score}/{a.max_score}</div>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}
