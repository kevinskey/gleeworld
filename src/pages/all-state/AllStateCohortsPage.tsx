// Director workspace: cohorts, rosters, readiness.
//
// The brief's test for this page is "a director opens GleeWorld and asks what
// do I need to know about All-State today". So the cohort view leads with
// students who need attention — overdue work first — rather than an
// alphabetical roster the director has to scan themselves.

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, Plus, AlertTriangle, ArrowLeft, CheckCircle2, CalendarSync } from 'lucide-react';
import { useAllStateStates, useStatePrograms } from '@/features/all-state/useAllState';
import {
  useCohorts, useParticipations, useCohortTasks, useEnsembles, useEnsembleRoster,
  useTenantRoster, useCreateCohort, useAddStudents, useSetParticipationStatus,
  useToggleTask, useCohortAttempts, useSyncCalendar, useCohortSubmissions,
  readinessByStudent, type CohortWithProgram,
} from '@/features/all-state/useCohorts';
import { AuditionRounds } from '@/features/all-state/AuditionRounds';

const STATUSES = [
  'not_started', 'preparing', 'registered', 'audition_submitted',
  'audition_complete', 'accepted', 'alternate', 'not_selected', 'withdrawn',
] as const;

const STATUS_TONE: Record<string, string> = {
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  alternate: 'bg-sky-50 text-sky-700 border-sky-200',
  not_selected: 'bg-muted text-muted-foreground',
  withdrawn: 'bg-muted text-muted-foreground',
};

const label = (s: { first_name: string | null; last_name: string | null } | null | undefined) =>
  [s?.first_name, s?.last_name].filter(Boolean).join(' ') || 'Unnamed student';

export default function AllStateCohortsPage() {
  const { data: cohorts, isLoading } = useCohorts();
  const [openCohort, setOpenCohort] = useState<CohortWithProgram | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (openCohort) {
    return <CohortDetail cohort={openCohort} onBack={() => setOpenCohort(null)} />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All-State cohorts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your students through a state&rsquo;s audition cycle.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> New cohort
        </Button>
      </header>

      {isLoading && <Skeleton className="h-40 rounded-xl" />}

      {!isLoading && (cohorts?.length ?? 0) === 0 && (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No cohorts yet"
          description="A cohort is one state program you're preparing students for — pick the program, optionally link one of your ensembles, and add students."
          actionLabel="New cohort"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className="space-y-3">
        {cohorts?.map((c) => (
          <Card key={c.id} className="cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => setOpenCohort(c)}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {c.program?.name}
                  {c.program?.season ? ` · ${c.program.season}` : ''}
                </p>
              </div>
              <Button variant="outline" size="sm">Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateCohortDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateCohortDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: states } = useAllStateStates();
  const [stateSlug, setStateSlug] = useState('');
  const { data: stateData } = useStatePrograms(stateSlug || undefined);
  const { data: ensembles } = useEnsembles();
  const create = useCreateCohort();

  const [programId, setProgramId] = useState('');
  const [ensembleId, setEnsembleId] = useState('');
  const [name, setName] = useState('');

  const program = stateData?.programs.find((p) => p.id === programId);

  function submit() {
    if (!programId) return;
    create.mutate(
      {
        program_id: programId,
        ensemble_id: ensembleId || null,
        name: name.trim() || program?.name || 'All-State cohort',
      },
      { onSuccess: () => { onOpenChange(false); setProgramId(''); setEnsembleId(''); setName(''); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New cohort</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select value={stateSlug} onValueChange={(v) => { setStateSlug(v); setProgramId(''); }}>
              <SelectTrigger><SelectValue placeholder="Choose a state…" /></SelectTrigger>
              <SelectContent>
                {states?.filter((s) => s.active).map((s) => (
                  <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {stateSlug && (
            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger><SelectValue placeholder="Choose a program…" /></SelectTrigger>
                <SelectContent>
                  {stateData?.programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} · {p.season}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The season comes from the program, so next year is a new cohort and this one stays intact.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Link an ensemble (optional)</Label>
            <Select value={ensembleId} onValueChange={setEnsembleId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {ensembles?.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Linking a class lets you pull its roster in one click. Leave blank if your
              All-State group spans several periods.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)}
                   placeholder={program?.name ?? '3rd period All-State group'} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!programId || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create cohort'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CohortDetail({ cohort, onBack }: { cohort: CohortWithProgram; onBack: () => void }) {
  const { data: participations, isLoading } = useParticipations(cohort.id);
  const { data: tasks } = useCohortTasks(cohort.id);
  const participationIds = useMemo(
    () => (participations ?? []).map((p) => p.id), [participations]);
  const { data: attempts } = useCohortAttempts(participationIds);
  const { data: cohortSubs } = useCohortSubmissions(participationIds);

  // Voice-part summary, grouped to section level (S1+S2 → Soprano) from the
  // students' tenant voice parts — the at-a-glance headcount a director
  // scans before worrying about individuals.
  const partSummary = useMemo(() => {
    const groups: Record<string, number> = {};
    const NAME: Record<string, string> = { S: 'Soprano', A: 'Alto', T: 'Tenor', B: 'Bass' };
    for (const p of participations ?? []) {
      const vp = p.student?.voice_part?.trim();
      const key = vp ? (NAME[vp[0].toUpperCase()] ?? 'Other') : 'Unassigned';
      groups[key] = (groups[key] ?? 0) + 1;
    }
    const order = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Other', 'Unassigned'];
    return order.filter((k) => groups[k]).map((k) => ({ label: k, count: groups[k] }));
  }, [participations]);
  const { data: roster } = useEnsembleRoster(cohort.ensemble_id);
  const addStudents = useAddStudents(cohort.id, cohort.program_id);
  const setStatus = useSetParticipationStatus();
  const toggleTask = useToggleTask();
  const syncCalendar = useSyncCalendar();

  const [addOpen, setAddOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rosterQuery, setRosterQuery] = useState('');
  const { data: tenantRoster } = useTenantRoster(rosterQuery);

  const readiness = useMemo(
    () => readinessByStudent(participations ?? [], tasks ?? []),
    [participations, tasks],
  );

  // Students needing attention first: most overdue, then least complete.
  const ordered = useMemo(() => {
    return [...(participations ?? [])].sort((a, b) => {
      const ra = readiness[a.id], rb = readiness[b.id];
      if ((rb?.overdue ?? 0) !== (ra?.overdue ?? 0)) return (rb?.overdue ?? 0) - (ra?.overdue ?? 0);
      if ((ra?.percent ?? 0) !== (rb?.percent ?? 0)) return (ra?.percent ?? 0) - (rb?.percent ?? 0);
      return label(a.student).localeCompare(label(b.student));
    });
  }, [participations, readiness]);

  const alreadyIn = new Set((participations ?? []).map((p) => p.student_id));
  const candidates = (roster ?? []).filter((r) => !alreadyIn.has(r.id));
  // The tenant-wide roster is the primary source: production tenants have real
  // gw_profiles rosters but (today) zero ensembles, so an ensemble-only picker
  // left directors with nobody to add.
  const rosterCandidates = (tenantRoster ?? []).filter((r) => !alreadyIn.has(r.id));
  const needingAttention = ordered.filter((p) => (readiness[p.id]?.overdue ?? 0) > 0).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All cohorts
      </button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{cohort.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cohort.program?.name}{cohort.program?.season ? ` · ${cohort.program.season}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => syncCalendar.mutate(cohort.id)}
                  disabled={syncCalendar.isPending}>
            <CalendarSync className="mr-1.5 h-4 w-4" aria-hidden />
            {syncCalendar.isPending ? 'Syncing…' : 'Sync calendar'}
          </Button>
          <Button onClick={() => { setPicked(new Set()); setAddOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add students
          </Button>
        </div>
      </header>

      {ordered.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{ordered.length} student{ordered.length === 1 ? '' : 's'}</span>
          {partSummary.map((g) => (
            <Badge key={g.label} variant="outline" className="font-normal">
              {g.label} {g.count}
            </Badge>
          ))}
        </div>
      )}

      {needingAttention > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
            <span>
              <strong>{needingAttention}</strong> student{needingAttention === 1 ? '' : 's'} with overdue work.
            </span>
          </CardContent>
        </Card>
      )}

      {isLoading && <Skeleton className="h-40 rounded-xl" />}

      {!isLoading && ordered.length === 0 && (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No students yet"
          description={cohort.ensemble_id
            ? "Add students — you can pull them straight from the ensemble linked to this cohort."
            : "Add students to this cohort. Each one gets a checklist generated from the state's published requirements."}
          actionLabel="Add students"
          onAction={() => setAddOpen(true)}
        />
      )}

      <div className="space-y-2">
        {ordered.map((p) => {
          const r = readiness[p.id];
          const mine = (tasks ?? []).filter((t) => t.participation_id === p.id);
          const isOpen = expanded === p.id;
          return (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button className="text-left" onClick={() => setExpanded(isOpen ? null : p.id)}>
                    <CardTitle className="text-base">{label(p.student)}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {p.student?.voice_part ?? 'No voice part set'}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    {(r?.overdue ?? 0) > 0 && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 font-normal text-amber-800">
                        {r.overdue} overdue
                      </Badge>
                    )}
                    <Select value={p.status} onValueChange={(v) => setStatus.mutate({ id: p.id, status: v })}>
                      <SelectTrigger className={`h-8 w-[11rem] ${STATUS_TONE[p.status] ?? ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <Progress value={r?.percent ?? 0} className="h-2 flex-1" />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {r?.completed ?? 0}/{r?.total ?? 0}
                  </span>
                </div>
                {r?.nextDue && !isOpen && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Next: {r.nextDue.title} — {new Date(r.nextDue.due_at).toLocaleDateString()}
                  </p>
                )}

                {isOpen && (() => {
                  const subs = (cohortSubs ?? []).filter((sub) => sub.participation_id === p.id);
                  return (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Submitted recordings
                      </p>
                      {subs.length === 0 ? (
                        <p className="mt-1 text-sm text-muted-foreground">None submitted.</p>
                      ) : (
                        <ul className="mt-1.5 space-y-2">
                          {subs.map((sub, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-2">
                              <span className="text-sm">
                                {sub.recording?.title ?? 'Recording'}
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  {new Date(sub.submitted_at).toLocaleDateString()}
                                </span>
                              </span>
                              {sub.recording?.audio_url && (
                                <audio controls preload="none" src={sub.recording.audio_url}
                                       className="h-8 max-w-[16rem]" />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
                {isOpen && (
                  <AuditionRounds
                    participation={p}
                    programId={cohort.program_id}
                    attempts={(attempts ?? []).filter((a) => a.participation_id === p.id)}
                  />
                )}
                {isOpen && (
                  <ul className="mt-3 divide-y border-t pt-2">
                    {mine.length === 0 && (
                      <li className="py-2 text-sm text-muted-foreground">
                        No checklist — this state has no published requirements yet.
                      </li>
                    )}
                    {mine.map((t) => (
                      <li key={t.id} className="flex items-start gap-2 py-2">
                        <Checkbox
                          className="mt-0.5"
                          checked={!!t.completed_at}
                          onCheckedChange={(v) => toggleTask.mutate({ id: t.id, done: !!v })}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${t.completed_at ? 'text-muted-foreground line-through' : ''}`}>
                            {t.title}
                          </p>
                          {t.description && (
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                          )}
                        </div>
                        {t.due_at && (
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {new Date(t.due_at).toLocaleDateString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Add students</DialogTitle></DialogHeader>
          {cohort.ensemble_id && candidates.length > 0 && (
            <>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                From the linked ensemble
              </p>
              <ul className="space-y-1">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50">
                      <Checkbox
                        checked={picked.has(c.id)}
                        onCheckedChange={(v) => setPicked((s) => {
                          const n = new Set(s);
                          if (v) n.add(c.id); else n.delete(c.id);
                          return n;
                        })}
                      />
                      <span className="flex-1 text-sm">{label(c)}</span>
                      {c.voice_part && (
                        <Badge variant="outline" className="font-normal">{c.voice_part}</Badge>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {cohort.ensemble_id ? 'Anyone in your workspace' : 'Your workspace roster'}
          </p>
          <Input
            value={rosterQuery}
            onChange={(e) => setRosterQuery(e.target.value)}
            placeholder="Search by name…"
          />
          {rosterCandidates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {rosterQuery ? 'No one matches that search.' : 'Everyone is already in this cohort.'}
            </p>
          )}
          {rosterCandidates.length > 0 && (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {rosterCandidates.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50">
                    <Checkbox
                      checked={picked.has(c.id)}
                      onCheckedChange={(v) => setPicked((s) => {
                        const n = new Set(s);
                        if (v) n.add(c.id); else n.delete(c.id);
                        return n;
                      })}
                    />
                    <span className="flex-1 text-sm">{label(c)}</span>
                    {c.voice_part && (
                      <Badge variant="outline" className="font-normal">{c.voice_part}</Badge>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            {candidates.length > 0 && (
              <Button variant="outline" onClick={() => setPicked(new Set(candidates.map((c) => c.id)))}>
                Select ensemble
              </Button>
            )}
            <Button
              disabled={picked.size === 0 || addStudents.isPending}
              onClick={() => addStudents.mutate([...picked], { onSuccess: () => setAddOpen(false) })}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
              {addStudents.isPending ? 'Adding…' : `Add ${picked.size || ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
