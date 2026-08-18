import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { filterAssignableMembers } from '@/lib/fees/feeListUtils';
import type { FeeTemplate } from '@/hooks/useFeeTemplates';

interface Member {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

/**
 * One-off fee for a single student ("lost folder, $12") — no template needed.
 * Insert shape mirrors assign_fee_template minus template/context columns;
 * tenant_id comes from the table's default/trigger.
 */
export function NewIndividualFeeDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState('');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FeeTemplate['category']>('other');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email, role')
        .not('user_id', 'is', null);
      setMembers((data ?? []) as Member[]);
    })();
  }, [open]);

  const shown = useMemo(() => {
    const students = filterAssignableMembers(members, true);
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      m =>
        (m.full_name ?? '').toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q),
    );
  }, [members, search]);

  const submit = async () => {
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      // .select() is load-bearing: demo-tenant RLS rejections are silent
      // without it and the dialog would report success on a dropped write.
      const { error } = await supabase
        .from('gw_student_fees')
        .insert({
          user_id: memberId,
          category,
          name,
          amount,
          due_date: dueDate || null,
          status: 'pending',
          created_by: userData?.user?.id,
        })
        .select();
      if (error) throw error;
      toast({ title: 'Fee created' });
      onCreated();
      onClose();
    } catch (e) {
      toast({
        title: 'Could not create fee',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New individual fee</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search students…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="max-h-40 overflow-y-auto border rounded divide-y">
            {shown.map(m => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => setMemberId(m.user_id)}
                className={`w-full text-left p-2 text-sm hover:bg-accent ${
                  memberId === m.user_id ? 'bg-accent font-medium' : ''
                }`}
              >
                {m.full_name || 'Unnamed student'}
                <span className="text-xs text-muted-foreground ml-2">{m.email}</span>
              </button>
            ))}
            {shown.length === 0 && (
              <p className="p-3 text-sm text-center text-muted-foreground">No students found.</p>
            )}
          </div>
          <Input
            placeholder="Fee name (e.g., Lost folder replacement)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <Select value={category} onValueChange={v => setCategory(v as FeeTemplate['category'])}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dues">Dues</SelectItem>
                <SelectItem value="participation">Participation</SelectItem>
                <SelectItem value="fundraiser">Fundraiser</SelectItem>
                <SelectItem value="wardrobe">Wardrobe</SelectItem>
                <SelectItem value="trip">Trip</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
            />
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !memberId || !name || amount <= 0}>
            {busy ? 'Creating…' : 'Create fee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
