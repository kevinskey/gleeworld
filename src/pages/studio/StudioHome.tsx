// GleeWorld Studio — sessions list. /studio entry point.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Music2, Plus, Trash2, Mic, Sliders, AudioLines, Users } from 'lucide-react';
import {
  useMySessions, useCreateStudioSession, useDeleteStudioSession, useStudioOwner,
} from '@/hooks/useStudio';
import { toast } from 'sonner';
import type { Accompaniment } from '@/lib/studio/session';
import { AccompanimentPicker, type PickerResult } from '@/components/studio/AccompanimentPicker';

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

  type Template = 'empty' | 'satb' | 'custom';

  const onCreated = async (i: { title: string; template: Template; accompaniment: Accompaniment | null; accompanimentFile?: File | null }) => {
    if (!owner.data) return;
    try {
      const s = await createMut.mutateAsync({
        tenantId: owner.data.tenantId,
        ownerUserId: owner.data.userId,
        title: i.title || 'Untitled session',
        template: i.template,
        // File variant: pass the raw File so the mutation uploads it at
        // create time and the manifest gets a real public URL.
        ...(i.accompanimentFile
          ? { accompanimentFile: i.accompanimentFile }
          : { accompaniment: i.accompaniment }),
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
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
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
      <span className="text-xs font-medium text-foreground/85 drop-shadow-sm">{label}</span>
    </div>
  );
}

// Three-card create flow:
//   pick → (satb/custom → backing) → title → create + navigate.
//   empty → title → create + navigate (skips backing step).

type Template = 'empty' | 'satb' | 'custom';
type Step = 'pick' | 'backing' | 'title';

/** Maps the picker's internal PickerResult into the session Accompaniment type.
 * NOTE: 'file' picks must be routed through accompanimentFile (raw File →
 * upload in mutation) and must NOT pass through here. handlePick enforces this
 * so this branch should never be reached. */
function mapPickerResult(r: PickerResult): Accompaniment {
  if (r.kind === 'file') {
    // Should not be reached — handlePick routes file picks to accompanimentFile.
    // Guard here so a future refactor can't accidentally regress to fileUrl:''.
    throw new Error('[mapPickerResult] file picks must use accompanimentFile, not this mapper');
  }
  if (r.kind === 'apple_music') {
    return {
      kind: 'apple_music',
      title: r.title,
      appleMusicId: r.id,
      appleMusicStorefront: r.storefront,
      appleMusicArtist: r.artist,
      appleMusicArtworkUrl: r.artworkUrl,
    };
  }
  if (r.kind === 'apple_music_album') {
    return {
      kind: 'apple_music_album',
      title: r.title,
      appleMusicId: r.id,
      appleMusicStorefront: r.storefront,
      appleMusicArtist: r.artist,
      appleMusicArtworkUrl: r.artworkUrl,
    };
  }
  // youtube
  return { kind: 'youtube', title: null, youtubeUrl: r.url };
}

function TemplateCard({
  label, icon: Icon, description, onClick,
}: { label: string; icon: typeof Sliders; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl border-2 border-border hover:border-primary focus:border-primary focus:outline-none bg-card p-4 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-sm font-semibold mb-1">{label}</div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

function TitleStep({
  busy, onBack, onCancel, onSubmit,
}: { busy: boolean; onBack: () => void; onCancel: () => void; onSubmit: (t: string) => void }) {
  const [title, setTitle] = useState('');
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Session title (optional)</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Spring concert demo"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(title.trim()); }}
        />
      </div>
      <div className="flex justify-between gap-2 pt-1">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSubmit(title.trim())} disabled={busy}>
            {busy ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</> : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateSessionDialog({
  open, onOpenChange, onSubmit, busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (i: { title: string; template: Template; accompaniment: Accompaniment | null; accompanimentFile?: File | null }) => void;
  busy: boolean;
}) {
  const [step, setStep] = useState<Step>('pick');
  const [template, setTemplate] = useState<Template>('empty');
  // Non-file accompaniment kinds (apple_music, youtube, etc.) — already
  // fully mappable to the Accompaniment manifest type at pick time.
  const [accompaniment, setAccompaniment] = useState<Accompaniment | null>(null);
  // File picks: keep the raw File object here so the mutation can upload
  // it at create time. Never written as accompaniment (no placeholder URL).
  const [accompanimentFile, setAccompanimentFile] = useState<File | null>(null);

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setStep('pick');
      setTemplate('empty');
      setAccompaniment(null);
      setAccompanimentFile(null);
    }
    onOpenChange(o);
  };

  const titleFor: Record<Step, string> = {
    pick: 'New session',
    backing: 'Choose backing track',
    title: 'Name your session',
  };

  const handlePick = (r: PickerResult) => {
    if (r.kind === 'file') {
      // Keep the raw File; don't map to Accompaniment yet — the mutation
      // uploads it and writes the real URL into the manifest.
      setAccompanimentFile(r.file);
      setAccompaniment(null);
    } else {
      setAccompaniment(mapPickerResult(r));
      setAccompanimentFile(null);
    }
    setStep('title');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titleFor[step]}</DialogTitle>
        </DialogHeader>

        {step === 'pick' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <TemplateCard
              label="Empty"
              icon={Sliders}
              description="Blank multitrack — add tracks yourself."
              onClick={() => { setTemplate('empty'); setStep('title'); }}
            />
            <TemplateCard
              label="Voice parts (SATB)"
              icon={Users}
              description="Four pre-labeled tracks: Soprano, Alto, Tenor, Bass."
              onClick={() => { setTemplate('satb'); setStep('backing'); }}
            />
            <TemplateCard
              label="Custom"
              icon={AudioLines}
              description="Start with your own part layout and a backing track."
              onClick={() => { setTemplate('custom'); setStep('backing'); }}
            />
          </div>
        )}

        {step === 'backing' && (
          <AccompanimentPicker
            open={true}
            embedded
            onPick={handlePick}
            onSkip={() => { setAccompaniment(null); setAccompanimentFile(null); setStep('title'); }}
          />
        )}

        {step === 'title' && (
          <TitleStep
            busy={busy}
            onBack={() => setStep(template === 'empty' ? 'pick' : 'backing')}
            onCancel={() => handleOpenChange(false)}
            onSubmit={(t) => onSubmit({ title: t, template, accompaniment, accompanimentFile })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
