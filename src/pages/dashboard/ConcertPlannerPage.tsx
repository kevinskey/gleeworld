// Concert Planner — list of all programs the tenant has built.
// Click a card to open the editor; the "+ New program" button kicks off
// a template picker dialog and routes to /dashboard/concert-planner/:id.

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, Calendar, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useConcertPrograms,
  createConcertProgram,
  deleteConcertProgram,
} from '@/hooks/useConcertPrograms';
import { useQueryClient } from '@tanstack/react-query';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

interface SetlistOption {
  id: string;
  title: string;
  concert_name: string | null;
}

export default function ConcertPlannerPage() {
  const { data: programs = [], isLoading, refetch } = useConcertPrograms();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Concert Planner"
      icon={ClipboardList}
      subtitle="Build printed programs and public web pages from your library. One data set drives both the printout and the published page."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> New program
        </Button>
      }
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : programs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
          <ClipboardList className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No programs yet. Give one a title and start building.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <li
              key={p.id}
              className="group relative rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <Link to={`/dashboard/concert-planner/${p.id}`} className="block">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {p.template_kind}
                </div>
                <div className="text-lg font-semibold leading-tight mt-1">{p.title}</div>
                {p.subtitle && (
                  <div className="text-sm text-muted-foreground truncate mt-0.5">{p.subtitle}</div>
                )}
                <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {p.event_date
                    ? new Date(p.event_date).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })
                    : 'No date set'}
                </div>
                {p.venue && <div className="text-xs text-muted-foreground truncate">{p.venue}</div>}
              </Link>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Delete "${p.title}"?`)) return;
                  await deleteConcertProgram(p.id);
                  qc.invalidateQueries({ queryKey: ['concert-programs'] });
                  toast.success('Program deleted');
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                aria-label="Delete program"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <CreateProgramDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (title, setlistId) => {
          const id = await createConcertProgram({ title, setlist_id: setlistId });
          if (!id) { toast.error('Failed to create program'); return; }
          await refetch();
          navigate(`/dashboard/concert-planner/${id}`);
        }}
      />
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

const NO_SETLIST = 'none';

function CreateProgramDialog({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, setlistId: string | null) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [setlistId, setSetlistId] = useState<string>(NO_SETLIST);
  const [setlists, setSetlists] = useState<SetlistOption[]>([]);
  const [loadingSetlists, setLoadingSetlists] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchSetlists = useCallback(async () => {
    setLoadingSetlists(true);
    try {
      const { data, error } = await supabase
        .from('gw_setlists')
        .select('id, title, concert_name')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { setSetlists([]); return; }
      setSetlists((data ?? []) as SetlistOption[]);
    } finally {
      setLoadingSetlists(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setSetlistId(NO_SETLIST);
      setSetlists([]);
      return;
    }
    void fetchSetlists();
  }, [open, fetchSetlists]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New concert program</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="program-title">Program title</Label>
            <Input
              id="program-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring Concert 2026"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="program-setlist">Start from a setlist (optional)</Label>
            <Select value={setlistId} onValueChange={setSetlistId}>
              <SelectTrigger id="program-setlist" className="mt-1">
                {loadingSetlists ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                  </span>
                ) : (
                  <SelectValue placeholder="None" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SETLIST}>None</SelectItem>
                {setlists.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}{s.concert_name ? ` — ${s.concert_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Imports the setlist&apos;s pieces into the program automatically.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!title.trim()) return;
              setBusy(true);
              try {
                await onCreate(title.trim(), setlistId === NO_SETLIST ? null : setlistId);
              } finally {
                setBusy(false);
              }
              onClose();
            }}
            disabled={!title.trim() || busy}
          >
            {busy ? 'Creating…' : 'Create program'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
