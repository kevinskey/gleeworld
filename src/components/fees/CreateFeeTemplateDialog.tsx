import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useFeeTemplates, FeeTemplate } from '@/hooks/useFeeTemplates';
import { FeeInstallmentScheduleEditor, InstallmentRow } from './FeeInstallmentScheduleEditor';

export function CreateFeeTemplateDialog({
  open,
  onClose,
  defaultCategory,
  contextType,
  contextId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultCategory?: FeeTemplate['category'];
  contextType?: FeeTemplate['context_type'];
  contextId?: string;
  onCreated: (tpl: FeeTemplate) => void;
}) {
  const { createTemplate } = useFeeTemplates();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState<FeeTemplate['category']>(
    defaultCategory ?? 'other',
  );
  const [allowSplit, setAllowSplit] = useState(true);
  const [schedule, setSchedule] = useState<InstallmentRow[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const tpl = await createTemplate({
        category,
        name,
        description: desc,
        total_amount: amount,
        due_date: dueDate || undefined,
        allow_self_serve_split: allowSplit,
        context_type: contextType,
        context_id: contextId,
        installments: schedule.length ? schedule : undefined,
      });
      onCreated(tpl);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New fee template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select
            value={category}
            onValueChange={v => setCategory(v as FeeTemplate['category'])}
          >
            <SelectTrigger>
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
            placeholder="Name (e.g., 2026 Rome Tour Deposit)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="Total amount"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allowSplit}
              onCheckedChange={v => setAllowSplit(!!v)}
            />
            Allow students to split into self-serve installments
          </label>
          <div>
            <div className="text-sm font-medium mb-1">
              Admin-defined installment schedule (optional)
            </div>
            <FeeInstallmentScheduleEditor value={schedule} onChange={setSchedule} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name || amount <= 0}>
            {busy ? 'Creating…' : 'Create template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
