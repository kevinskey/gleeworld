// Concert Planner — list of all programs the tenant has built.
// Click a card to open the editor; the "+ New program" button kicks off
// a template picker dialog and routes to /dashboard/concert-planner/:id.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, Calendar, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useConcertPrograms,
  createConcertProgram,
  deleteConcertProgram,
  type ProgramTemplate,
} from '@/hooks/useConcertPrograms';
import { useQueryClient } from '@tanstack/react-query';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const TEMPLATES: Array<{ kind: ProgramTemplate; label: string; blurb: string }> = [
  { kind: 'choral',    label: 'Choral Concert',     blurb: 'Vintage letterpress style — title and composer with dot leaders, performer name centered under each group.' },
  { kind: 'classical', label: 'Classical Recital',  blurb: 'Centered title, single column, composer dates under each work.' },
  { kind: 'festival',  label: 'Multi-Section Festival', blurb: 'Section dividers (Sacred / Spirituals / Encore), choir credits.' },
  { kind: 'recital',   label: 'Student Recital',    blurb: 'Per-piece performer name, brief program notes.' },
];

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
            No programs yet. Pick a template and start building one.
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
        onCreate={async (title, template_kind) => {
          const id = await createConcertProgram({ title, template_kind });
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

function CreateProgramDialog({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, template: ProgramTemplate) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<ProgramTemplate>('choral');
  const [busy, setBusy] = useState(false);

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
            <Label>Template</Label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => setTemplate(t.kind)}
                  className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                    template === t.kind
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{t.blurb}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!title.trim()) return;
              setBusy(true);
              try { await onCreate(title.trim(), template); } finally { setBusy(false); }
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
