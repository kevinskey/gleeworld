// GleeWorld Studio — sessions list. /studio entry point.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Music2, Plus, Trash2, Mic } from 'lucide-react';
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
       * glass, piano + sax on the floor. 20% opacity so it sits behind
       * the page without overpowering the light theme. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: 'url(/studio-bg.png)' }}
      />
      <div className="relative px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 drop-shadow-sm">
            <Mic className="w-7 h-7 text-primary" /> Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
        <Card className="border-dashed bg-card/95 backdrop-blur-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
            <Music2 className="w-8 h-8 mx-auto opacity-40" />
            <p>No sessions yet.</p>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!owner.data}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Start your first session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sessions.data!.map((s) => (
            <li key={s.id}>
              <Card className="hover:shadow-md transition-shadow bg-card/95 backdrop-blur-sm">
                <CardContent className="p-4 flex flex-col h-full">
                  <Link to={`/studio/sessions/${s.id}`} className="block flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Music2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm leading-tight">{s.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.track_count} {s.track_count === 1 ? 'track' : 'tracks'}
                          {' · '}{Math.round(s.duration_seconds)}s
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Updated {formatDate(s.updated_at)}
                    </div>
                  </Link>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm" variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete "${s.title}"? This can't be undone.`)) return;
                        try { await delMut.mutateAsync(s.id); toast.success('Deleted'); }
                        catch (e) { toast.error('Could not delete', { description: e instanceof Error ? e.message : String(e) }); }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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

function CreateSessionDialog({
  open, onOpenChange, onSubmit, busy,
}: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (title: string) => void; busy: boolean }) {
  const [title, setTitle] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Studio session</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Spring concert demo" autoFocus />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onSubmit(title.trim())} disabled={busy}>
              {busy ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</> : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
