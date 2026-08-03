// Edit a personal score's metadata (title / composer / voicing). Writes go
// through usePersonalScores.updateScore, which `.select()`s so RLS or
// demo-tenant silent no-ops surface as errors instead of lying successes.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { PersonalScore } from '@/hooks/usePersonalScores';

export function EditPersonalScoreDialog({
  score, onOpenChange, onSave,
}: {
  score: PersonalScore | null;
  onOpenChange: (open: boolean) => void;
  onSave: (score: PersonalScore, patch: { title: string; composer: string | null; voicing: string | null }) => Promise<void>;
}) {
  const open = !!score;
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (score) {
      setTitle(score.title ?? '');
      setComposer(score.composer ?? '');
      setVoicing(score.voicing ?? '');
    }
  }, [score]);

  const save = async () => {
    if (!score) return;
    setSaving(true);
    try {
      await onSave(score, {
        title: title.trim() || score.title,
        composer: composer.trim() || null,
        voicing: voicing.trim() || null,
      });
      toast.success('Score updated.');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit score</DialogTitle>
          <DialogDescription>Update the title, composer, and voicing in your personal library.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="mm-edit-title">Title</Label>
            <Input id="mm-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mm-edit-composer">Composer</Label>
              <Input id="mm-edit-composer" value={composer} onChange={(e) => setComposer(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="mm-edit-voicing">Voicing</Label>
              <Input id="mm-edit-voicing" value={voicing} onChange={(e) => setVoicing(e.target.value)} placeholder="SATB" className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Pencil className="w-4 h-4 mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
