// Edit a personal score's metadata (title / composer / voicing / tags).
// Writes go through usePersonalScores.updateScore, which `.select()`s so
// RLS or demo-tenant silent no-ops surface as errors instead of lying
// successes.
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import type { PersonalScore } from '@/hooks/usePersonalScores';

export function EditPersonalScoreDialog({
  score, onOpenChange, onSave, tagSuggestions = [],
}: {
  score: PersonalScore | null;
  onOpenChange: (open: boolean) => void;
  onSave: (score: PersonalScore, patch: { title: string; composer: string | null; voicing: string | null; tags: string[] }) => Promise<void>;
  // Union of the user's existing tags — offered as one-tap suggestions.
  tagSuggestions?: string[];
}) {
  const open = !!score;
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (score) {
      setTitle(score.title ?? '');
      setComposer(score.composer ?? '');
      setVoicing(score.voicing ?? '');
      setTags(score.tags ?? []);
      setTagInput('');
    }
  }, [score]);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput('');
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const unusedSuggestions = useMemo(
    () => tagSuggestions.filter((t) => !tags.includes(t)).slice(0, 8),
    [tagSuggestions, tags],
  );

  const save = async () => {
    if (!score) return;
    setSaving(true);
    try {
      await onSave(score, {
        title: title.trim() || score.title,
        composer: composer.trim() || null,
        voicing: voicing.trim() || null,
        // Anything still sitting in the input counts too — losing a typed
        // tag because Enter wasn't pressed reads as a bug.
        tags: tagInput.trim() ? [...tags, tagInput.trim().replace(/^#/, '')] : tags,
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
          <div>
            <Label htmlFor="mm-edit-tags">Tags</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs gap-1">
                    #{t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      aria-label={`Remove tag ${t}`}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              id="mm-edit-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
              }}
              placeholder="Type a tag and press Enter…"
              className="mt-1.5"
            />
            {unusedSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {unusedSuggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
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
