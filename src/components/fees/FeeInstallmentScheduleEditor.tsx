import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface InstallmentRow {
  sequence: number;
  amount: number;
  due_date: string;
}

export function FeeInstallmentScheduleEditor({
  value,
  onChange,
}: {
  value: InstallmentRow[];
  onChange: (v: InstallmentRow[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.map((row, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <span className="w-6 text-sm text-muted-foreground">#{row.sequence}</span>
          <Input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={row.amount}
            onChange={e => {
              const next = [...value];
              next[idx] = { ...row, amount: Number(e.target.value) };
              onChange(next);
            }}
          />
          <Input
            type="date"
            value={row.due_date}
            onChange={e => {
              const next = [...value];
              next[idx] = { ...row, due_date: e.target.value };
              onChange(next);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(value.filter((_, i) => i !== idx))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([...value, { sequence: value.length + 1, amount: 0, due_date: '' }])
        }
      >
        + Add installment
      </Button>
    </div>
  );
}
