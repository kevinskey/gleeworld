// Student view. Phone-first: the brief's test is that a student opens this on
// a phone and sees what to practise and what's due next.
//
// So the page leads with the single next deadline, then the checklist. It does
// NOT lead with an explanation of the program — a student who is in an
// All-State cohort already knows what All-State is.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { CalendarClock, Music4, ExternalLink, Award } from 'lucide-react';
import {
  useMyParticipations, useMyTasks, useMyChildren, useMyChildrenDates,
  computeReadiness, practiceLinkFor,
} from '@/features/all-state/useMyAllState';
import { useToggleTask } from '@/features/all-state/useCohorts';
import { trackEvent } from '@/lib/analytics';

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  preparing: 'Preparing',
  registered: 'Registered',
  audition_submitted: 'Audition submitted',
  audition_complete: 'Audition complete',
  accepted: 'Accepted',
  alternate: 'Alternate',
  not_selected: 'Not selected',
  withdrawn: 'Withdrawn',
};

function daysUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

export default function MyAllStatePage() {
  const { data: parts, isLoading } = useMyParticipations();
  const ids = useMemo(() => (parts ?? []).map((p) => p.id), [parts]);
  const { data: tasks } = useMyTasks(ids);
  const { data: children } = useMyChildren();
  const childIds = useMemo(() => (children ?? []).map((c) => c.participation_id), [children]);
  const { data: childDates } = useMyChildrenDates(childIds);
  const toggle = useToggleTask();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-40 rounded-xl" />
      </div>
    );
  }

  if (!parts?.length && !children?.length) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <EmptyState
          icon={<Award className="h-8 w-8" />}
          title="You're not in an All-State cohort"
          description="When your director adds you to one — or links you as a parent of a participating student — it will appear here. In the meantime you can browse what your state requires."
          actionLabel="Browse All-State by state"
          onAction={() => { window.location.href = '/all-state'; }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">My All-State</h1>

      <div className="mt-6 space-y-6">
        {parts.map((p) => {
          const mine = (tasks ?? []).filter((t) => t.participation_id === p.id);
          const r = computeReadiness(mine, new Date());
          const open = mine.filter((t) => !t.completed_at);
          const done = mine.filter((t) => t.completed_at);

          return (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{p.program_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {p.state_name} · {p.program_season}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-normal">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* What's next — the reason a student opens this. */}
                {r.nextDue ? (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Next due
                    </p>
                    <p className="mt-1 font-medium">{r.nextDue.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.nextDue.due_at).toLocaleDateString(undefined,
                        { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}{daysUntil(r.nextDue.due_at)}
                    </p>
                  </div>
                ) : r.overdue > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                    You have {r.overdue} overdue item{r.overdue === 1 ? '' : 's'}.
                  </div>
                ) : null}

                <div className="flex items-center gap-3">
                  <Progress value={r.percent} className="h-2 flex-1" />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {r.completed}/{r.total}
                  </span>
                </div>

                {mine.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No checklist yet — your state hasn&rsquo;t published its requirements,
                    or your director hasn&rsquo;t generated one.
                  </p>
                )}

                {open.length > 0 && (
                  <ul className="divide-y">
                    {open.map((t) => {
                      const link = practiceLinkFor(t);
                      const overdue = t.due_at && new Date(t.due_at) < new Date();
                      return (
                        <li key={t.id} className="flex items-start gap-3 py-3">
                          <Checkbox
                            className="mt-0.5"
                            checked={false}
                            onCheckedChange={(v) => toggle.mutate({ id: t.id, done: !!v })}
                            aria-label={`Mark "${t.title}" done`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{t.title}</p>
                            {t.description && (
                              <p className="text-sm text-muted-foreground">{t.description}</p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-3">
                              {t.due_at && (
                                <span className={`text-xs ${overdue ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                  {daysUntil(t.due_at)}
                                </span>
                              )}
                              {link && (
                                <Link to={link.href}
                                      onClick={() => trackEvent('all_state_practice_started', { task_type: t.task_type })}
                                      className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2">
                                  <Music4 className="h-3 w-3" aria-hidden /> {link.label}
                                </Link>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {done.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      {done.length} completed
                    </summary>
                    <ul className="mt-2 divide-y">
                      {done.map((t) => (
                        <li key={t.id} className="flex items-start gap-3 py-2">
                          <Checkbox
                            className="mt-0.5"
                            checked
                            onCheckedChange={(v) => toggle.mutate({ id: t.id, done: !!v })}
                            aria-label={`Mark "${t.title}" not done`}
                          />
                          <span className="text-sm text-muted-foreground line-through">{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <Link to={`/all-state/${p.state_slug}`}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  What {p.state_name} requires <ExternalLink className="h-3 w-3" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(children?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Your children</h2>
          {/* Deliberately spare, per the product rule "dates, cost, and
              location — and nothing else": no status, results, or progress.
              Costs and location live on the linked public state page. */}
          <div className="mt-3 space-y-4">
            {children!.map((c) => {
              const upcoming = (childDates ?? [])
                .filter((d) => d.participation_id === c.participation_id
                            && new Date(d.due_at) >= new Date())
                .slice(0, 4);
              return (
                <Card key={c.participation_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {c.child_first_name ?? 'Your student'} — {c.program_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {c.state_name} · {c.program_season}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcoming.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upcoming dates.</p>
                    ) : (
                      <ul className="divide-y">
                        {upcoming.map((d, i) => (
                          <li key={i} className="flex items-baseline justify-between gap-3 py-2">
                            <span className="text-sm">{d.title}</span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {new Date(d.due_at).toLocaleDateString(undefined,
                                { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link to={`/all-state/${c.state_slug}`}
                          className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2">
                      Dates, costs and location for {c.state_name} All-State
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
        <Link to="/all-state">Browse other states</Link>
      </Button>
    </div>
  );
}
