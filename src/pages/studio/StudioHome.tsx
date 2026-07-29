// GleeWorld Studio — sessions list. /studio entry point.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Music2, Plus, Trash2, Mic, Sliders, AudioLines, Users, ArrowRight } from 'lucide-react';
import {
  useMySessions, useCreateStudioSession, useDeleteStudioSession, useStudioOwner,
} from '@/hooks/useStudio';
import { toast } from 'sonner';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StudioHome() {
  const sessions = useMySessions();
  const owner = useStudioOwner();
  const createMut = useCreateStudioSession();
  const delMut = useDeleteStudioSession();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const onCreated = async (title: string) => {
    if (!owner.data) return;
    try {
      const s = await createMut.mutateAsync({
        tenantId: owner.data.tenantId,
        ownerUserId: owner.data.userId,
        title: title || 'Untitled session',
      });
      setCreateOpen(false);
      navigate(`/studio/sessions/${s.id}`);
    } catch (e) {
      toast.error('Could not create session', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Studio hero background — singer at a Neumann, mixer through the
       * glass, piano + sax on the floor.
       *
       * sticky top-0 h-screen pins the photo to the top of the scroll
       * container's viewport at all times, no matter how long the
       * sessions list grows. -mb-[100vh] cancels the space it would
       * otherwise push into flow, so content sits on top. */}
      <div
        aria-hidden
        className="pointer-events-none sticky top-0 -mb-[100vh] h-screen bg-cover bg-center bg-no-repeat opacity-60 z-0"
        style={{ backgroundImage: 'url(/studio-bg.png)' }}
      />
      <div className="relative px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 drop-shadow-sm">
            <Mic className="w-7 h-7 text-primary" /> Studio
          </h1>
          <p className="text-sm text-foreground/85 mt-1 drop-shadow-sm">
            Multi-track composition + recording. Sessions sync across your devices.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!owner.data}>
          <Plus className="w-4 h-4 mr-1.5" /> New session
        </Button>
      </header>

      <CreateSessionDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={onCreated} busy={createMut.isPending} />

      {sessions.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sessions…
        </div>
      ) : (sessions.data ?? []).length === 0 ? (
        <EmptyStudio onStart={() => setCreateOpen(true)} disabled={!owner.data} />
      ) : (
        <ul className="ml-auto w-full max-w-xs sm:max-w-sm space-y-2">
          {sessions.data!.map((s) => (
            <li key={s.id}>
              <Card className="hover:shadow-md transition-shadow bg-card/90 backdrop-blur-sm">
                <CardContent className="p-2.5 flex items-center gap-2.5">
                  <Link to={`/studio/sessions/${s.id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Music2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm leading-tight truncate">{s.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {s.track_count} {s.track_count === 1 ? 'track' : 'tracks'} · {Math.round(s.duration_seconds)}s · {formatDate(s.updated_at)}
                      </div>
                    </div>
                  </Link>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={async () => {
                      if (!confirm(`Delete "${s.title}"? This can't be undone.`)) return;
                      try { await delMut.mutateAsync(s.id); toast.success('Deleted'); }
                      catch (e) { toast.error('Could not delete', { description: e instanceof Error ? e.message : String(e) }); }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}

// Empty-state hero. The big-white-card version was a wall on top of the
// studio photo; this replaces it with a centered editorial column that
// lets the background lead. Glass badge + drop-shadow text keeps every
// element readable against the photo without a plain white block.
function EmptyStudio({ onStart, disabled }: { onStart: () => void; disabled: boolean }) {
  return (
    <div className="py-14 sm:py-24">
      <div className="max-w-md mx-auto text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 backdrop-blur-md border border-primary/40 flex items-center justify-center shadow-lg">
          <Music2 className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-md">
            Start something.
          </h2>
          <p className="text-sm sm:text-base text-foreground/85 drop-shadow-sm">
            Record, mix, and master right in the browser. Sessions sync across every device you sign in on.
          </p>
        </div>

        <Button
          size="lg"
          onClick={onStart}
          disabled={disabled}
          className="rounded-full px-6 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Start your first session
        </Button>

        <div className="pt-4 grid grid-cols-3 gap-2 w-full max-w-sm">
          <FeatureChip icon={Mic} label="Record" />
          <FeatureChip icon={Sliders} label="Mix" />
          <FeatureChip icon={AudioLines} label="Master" />
        </div>
      </div>
    </div>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: typeof Mic; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 px-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/60">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[11px] font-medium text-foreground/85 drop-shadow-sm">{label}</span>
    </div>
  );
}

// Two-step create flow:
//   1) Pick session flavor — a free-form Studio session (multitrack DAW) or
//      a Part Tracks session (choose an Apple Music / YouTube / uploaded /
//      captured backing track first, then record voice parts against it).
//   2) For Studio: name it, create, navigate to the session.
//      For Part Tracks: bounce to the existing /dashboard/part-tracks
//      landing where the create-project dialog already handles the
//      backing + voicing selections. No point duplicating that UI here.
function CreateSessionDialog({
  open, onOpenChange, onSubmit, busy,
}: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (title: string) => void; busy: boolean }) {
  const [step, setStep] = useState<'pick' | 'studio-title'>('pick');
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  // Reset back to the picker whenever the dialog closes so re-opening
  // it doesn't strand the user on the title-input step.
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setStep('pick');
      setTitle('');
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'pick' ? 'New session' : 'Name your Studio session'}
          </DialogTitle>
        </DialogHeader>

        {step === 'pick' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              What are you recording?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep('studio-title')}
                className="group text-left rounded-xl border-2 border-border hover:border-primary focus:border-primary focus:outline-none bg-card p-4 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold">Studio session</div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Free-form multitrack. Record, mix, and master with the full
                  DAW — tracks, buses, sends, mastering chain, export.
                </p>
                <div className="mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity inline-flex items-center gap-1">
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOpenChange(false);
                  navigate('/dashboard/part-tracks');
                }}
                className="group text-left rounded-xl border-2 border-border hover:border-primary focus:border-primary focus:outline-none bg-card p-4 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold">Part Tracks session</div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pick a backing track (Apple Music, YouTube, upload, or
                  capture from playback), then record Soprano/Alto/Tenor/
                  Bass or custom parts locked to it.
                </p>
                <div className="mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity inline-flex items-center gap-1">
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Spring concert demo"
                autoFocus
              />
            </div>
            <div className="flex justify-between gap-2 pt-1">
              <Button variant="ghost" onClick={() => setStep('pick')}>← Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button onClick={() => onSubmit(title.trim())} disabled={busy}>
                  {busy ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</> : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
