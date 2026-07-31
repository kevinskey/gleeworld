import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useFeeAssignment } from '@/hooks/useFeeAssignment';

interface Member {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

export function FeeAssignDialog({
  open,
  onClose,
  templateId,
  restrictToUserIds,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  templateId: string;
  restrictToUserIds?: string[];
  onAssigned: (count: number) => void;
}) {
  const { assign } = useFeeAssignment();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      let query = supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email, role')
        .not('user_id', 'is', null);
      if (restrictToUserIds?.length) {
        query = query.in('user_id', restrictToUserIds);
      }
      const { data } = await query;
      setMembers((data ?? []) as Member[]);
      setSelected(new Set());
    })();
  }, [open, restrictToUserIds]);

  const filtered = useMemo(
    () =>
      members.filter(
        m =>
          m.full_name.toLowerCase().includes(filter.toLowerCase()) ||
          m.email.toLowerCase().includes(filter.toLowerCase()),
      ),
    [members, filter],
  );

  const toggle = (userId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(userId);
    else next.delete(userId);
    setSelected(next);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const count = await assign(templateId, Array.from(selected));
      onAssigned(count);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign to members</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="Filter by name or email…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <div className="max-h-96 overflow-y-auto border rounded divide-y">
            {filtered.map(m => (
              <label
                key={m.user_id}
                className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(m.user_id)}
                  onCheckedChange={v => toggle(m.user_id, !!v)}
                />
                <span className="flex-1 text-sm">{m.full_name}</span>
                <span className="text-xs text-muted-foreground">{m.email}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="p-4 text-sm text-center text-muted-foreground">No members found.</p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{selected.size} selected</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || selected.size === 0}>
            {busy ? 'Assigning…' : `Assign to ${selected.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
