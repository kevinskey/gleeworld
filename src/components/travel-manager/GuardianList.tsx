import { useState } from 'react';
import { useGuardians, Guardian, GuardianInput } from '@/hooks/useGuardians';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Star, Pencil, Trash2 } from 'lucide-react';

type Relationship = Guardian['relationship'];

const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

const BLANK: GuardianInput = {
  name: '',
  email: '',
  phone: '',
  relationship: 'guardian',
  is_primary: false,
};

interface GuardianFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<GuardianInput & { id: string }>;
  onSave: (fields: GuardianInput) => Promise<void>;
  title: string;
}

function GuardianFormDialog({ open, onOpenChange, initial, onSave, title }: GuardianFormDialogProps) {
  const [fields, setFields] = useState<GuardianInput>({ ...BLANK, ...initial });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens with new initial values
  const handleOpenChange = (v: boolean) => {
    if (v) setFields({ ...BLANK, ...initial });
    onOpenChange(v);
  };

  const set = (k: keyof GuardianInput, v: string | boolean) =>
    setFields((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!fields.name.trim() || !fields.email.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...fields, phone: fields.phone || null });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Full name *</Label>
            <Input
              value={fields.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <Label className="text-xs">Email *</Label>
            <Input
              type="email"
              value={fields.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              type="tel"
              value={fields.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="(404) 555-0100"
            />
          </div>
          <div>
            <Label className="text-xs">Relationship</Label>
            <Select
              value={fields.relationship}
              onValueChange={(v) => set('relationship', v as Relationship)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!fields.is_primary}
              onChange={(e) => set('is_primary', e.target.checked)}
              className="rounded"
            />
            Set as primary contact
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!fields.name.trim() || !fields.email.trim() || saving}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface GuardianListProps {
  studentUserId: string;
}

export function GuardianList({ studentUserId }: GuardianListProps) {
  const { guardians, loading, add, update, remove, setPrimary } = useGuardians(studentUserId);
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Guardian | null>(null);

  const handleAdd = async (fields: GuardianInput) => {
    await add(fields);
    toast({ title: 'Guardian added' });
  };

  const handleEdit = async (fields: GuardianInput) => {
    if (!editTarget) return;
    await update(editTarget.id, fields);
    toast({ title: 'Guardian updated' });
  };

  const handleDelete = async (g: Guardian) => {
    try {
      await remove(g.id);
      toast({ title: 'Guardian removed' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleSetPrimary = async (g: Guardian) => {
    try {
      await setPrimary(g.id);
      toast({ title: `${g.name} set as primary contact` });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Guardians / parent contacts</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add guardian
        </Button>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        )}

        {!loading && guardians.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No guardians on file. Add one above.
          </p>
        )}

        {guardians.map((g) => (
          <div
            key={g.id}
            className="border rounded p-3 text-sm flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-medium">
                {g.is_primary && (
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
                <span className="truncate">{g.name}</span>
                <span className="text-muted-foreground font-normal capitalize text-xs">
                  ({g.relationship})
                </span>
              </div>
              <div className="text-muted-foreground mt-0.5 space-y-0.5">
                <div>{g.email}</div>
                {g.phone && <div>{g.phone}</div>}
              </div>
            </div>

            <div className="flex gap-1 shrink-0 mt-0.5">
              {!g.is_primary && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Set as primary"
                  onClick={() => handleSetPrimary(g)}
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                title="Edit"
                onClick={() => setEditTarget(g)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Delete"
                onClick={() => handleDelete(g)}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Add dialog */}
      <GuardianFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add guardian"
        initial={BLANK}
        onSave={handleAdd}
      />

      {/* Edit dialog */}
      {editTarget && (
        <GuardianFormDialog
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          title="Edit guardian"
          initial={editTarget}
          onSave={handleEdit}
        />
      )}
    </Card>
  );
}
