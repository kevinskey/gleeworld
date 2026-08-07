// Generic table + dialog editor driven by fieldSchemas.ts. One component
// serves all six Layer 1 child entities; adding a column to the canon means
// editing a schema line, not this file.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Pencil, Trash2, Inbox } from 'lucide-react';
import type { EntityDef, FieldDef } from './fieldSchemas';
import { useAdminRows, useSaveRow, useDeleteRow } from './useAllStateAdmin';

type Row = Record<string, unknown>;

/** DB value → form value. */
function toInput(field: FieldDef, value: unknown): string | boolean {
  if (value == null) return field.kind === 'checkbox' ? false : '';
  switch (field.kind) {
    case 'checkbox': return Boolean(value);
    case 'money_cents': return String(Number(value) / 100);
    case 'datetime': return new Date(String(value)).toISOString().slice(0, 16);
    case 'date': return new Date(String(value)).toISOString().slice(0, 10);
    case 'json': return JSON.stringify(value, null, 2);
    default: return String(value);
  }
}

/** Form value → DB value. Throws on malformed JSON so the dialog can report it. */
function toDb(field: FieldDef, raw: string | boolean): unknown {
  if (field.kind === 'checkbox') return Boolean(raw);
  const s = String(raw).trim();
  if (s === '') return null;
  switch (field.kind) {
    case 'number': return Number(s);
    case 'money_cents': return Math.round(Number(s) * 100);
    case 'datetime':
    case 'date': return new Date(s).toISOString();
    case 'json': return JSON.parse(s);
    default: return s;
  }
}

function cellText(field: FieldDef, value: unknown): string {
  if (value == null || value === '') return '—';
  if (field.kind === 'checkbox') return value ? 'Yes' : 'No';
  if (field.kind === 'money_cents') return `$${(Number(value) / 100).toFixed(2)}`;
  if (field.kind === 'datetime' || field.kind === 'date') {
    return new Date(String(value)).toLocaleDateString();
  }
  const s = String(value);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

interface Props {
  entity: EntityDef;
  programId: string;
  /** Values stamped onto every new row. */
  fixed: Record<string, unknown>;
}

export function RecordEditor({ entity, programId, fixed }: Props) {
  const { data: rows, isLoading } = useAdminRows(entity.table, programId, entity.defaultSort);
  const save = useSaveRow(entity.table);
  const remove = useDeleteRow(entity.table);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const tableFields = entity.fields.filter((f) => f.inTable);

  function openFor(row: Row | null) {
    setEditing(row);
    setFormError(null);
    const next: Record<string, string | boolean> = {};
    for (const f of entity.fields) next[f.name] = toInput(f, row?.[f.name]);
    setForm(next);
    setOpen(true);
  }

  function submit() {
    const values: Record<string, unknown> = { ...fixed };
    for (const f of entity.fields) {
      try {
        values[f.name] = toDb(f, form[f.name]);
      } catch {
        setFormError(`${f.label} is not valid JSON.`);
        return;
      }
      if (f.required && (values[f.name] == null || values[f.name] === '')) {
        setFormError(`${f.label} is required.`);
        return;
      }
    }
    save.mutate(
      { id: editing?.id as string | undefined, values },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{entity.plural}</h3>
        <Button size="sm" variant="outline" onClick={() => openFor(null)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden /> Add
        </Button>
      </div>

      {isLoading && <Skeleton className="h-24 rounded-lg" />}

      {!isLoading && (rows?.length ?? 0) === 0 && (
        <EmptyState
          icon={<Inbox className="h-7 w-7" />}
          title={`No ${entity.plural.toLowerCase()} yet`}
          description={`Nothing has been entered for this program. Only add what the state actually publishes — leave the rest blank.`}
          actionLabel={`Add ${entity.label.toLowerCase()}`}
          onAction={() => openFor(null)}
        />
      )}

      {!isLoading && (rows?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {tableFields.map((f) => (
                  <th key={f.name} className="px-3 py-2 font-medium">{f.label}</th>
                ))}
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows!.map((row) => (
                <tr key={String(row.id)} className="hover:bg-muted/30">
                  {tableFields.map((f) => (
                    <td key={f.name} className="px-3 py-2 align-top">
                      {cellText(f, row[f.name])}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openFor(row)}
                      aria-label={`Edit ${entity.label}`}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      aria-label={`Delete ${entity.label}`}
                      onClick={() => {
                        // Deliberately not a browser confirm(): a modal dialog
                        // blocks the whole page and these rows are cheap to
                        // re-add. The toast reports an RLS rejection.
                        remove.mutate(String(row.id));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${entity.label.toLowerCase()}` : `Add ${entity.label.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {entity.fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                {f.kind === 'checkbox' ? (
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(form[f.name])}
                      onCheckedChange={(v) => setForm((s) => ({ ...s, [f.name]: Boolean(v) }))}
                    />
                    <span className="text-sm font-medium">{f.label}</span>
                  </label>
                ) : (
                  <>
                    <Label htmlFor={f.name}>
                      {f.label}{f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {f.kind === 'select' ? (
                      <Select
                        value={String(form[f.name] ?? '')}
                        onValueChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}
                      >
                        <SelectTrigger id={f.name}><SelectValue placeholder="Choose…" /></SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.kind === 'textarea' || f.kind === 'json' ? (
                      <Textarea
                        id={f.name}
                        rows={f.kind === 'json' ? 4 : 3}
                        className={f.kind === 'json' ? 'font-mono text-xs' : undefined}
                        value={String(form[f.name] ?? '')}
                        placeholder={f.placeholder}
                        onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      />
                    ) : (
                      <Input
                        id={f.name}
                        type={
                          f.kind === 'number' || f.kind === 'money_cents' ? 'number'
                          : f.kind === 'datetime' ? 'datetime-local'
                          : f.kind === 'date' ? 'date'
                          : 'text'
                        }
                        step={f.kind === 'money_cents' ? '0.01' : undefined}
                        value={String(form[f.name] ?? '')}
                        placeholder={f.placeholder}
                        onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      />
                    )}
                  </>
                )}
                {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
              </div>
            ))}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
