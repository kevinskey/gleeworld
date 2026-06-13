// Generic settings form derived from a block's zod config schema. Handles
// strings, numbers, booleans, and enums; blocks with richer shapes (arrays,
// nested objects) ship their own EditorForm instead.
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function unwrap(t: z.ZodTypeAny): z.ZodTypeAny {
  let cur = t;
  while (cur instanceof z.ZodDefault || cur instanceof z.ZodOptional || cur instanceof z.ZodNullable) {
    cur = cur instanceof z.ZodDefault ? cur._def.innerType : cur.unwrap();
  }
  return cur;
}

const labelize = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

export function AutoForm({
  schema,
  config,
  onChange,
}: {
  schema: z.ZodTypeAny;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const base = unwrap(schema);
  if (!(base instanceof z.ZodObject)) return null;
  const shape = base.shape as Record<string, z.ZodTypeAny>;
  const set = (key: string, value: unknown) => onChange({ ...config, [key]: value });

  return (
    <div className="space-y-4">
      {Object.entries(shape).map(([key, fieldSchema]) => {
        const field = unwrap(fieldSchema);
        const value = config[key];

        if (field instanceof z.ZodBoolean) {
          return (
            <div key={key} className="flex items-center justify-between">
              <Label>{labelize(key)}</Label>
              <Switch checked={!!value} onCheckedChange={(v) => set(key, v)} />
            </div>
          );
        }
        if (field instanceof z.ZodNumber) {
          return (
            <div key={key} className="space-y-1.5">
              <Label>{labelize(key)}</Label>
              <Input
                type="number"
                value={(value as number) ?? ''}
                onChange={(e) => set(key, e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </div>
          );
        }
        if (field instanceof z.ZodEnum) {
          return (
            <div key={key} className="space-y-1.5">
              <Label>{labelize(key)}</Label>
              <Select value={(value as string) ?? ''} onValueChange={(v) => set(key, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(field.options as string[]).map((opt) => (
                    <SelectItem key={opt} value={opt}>{labelize(opt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        if (field instanceof z.ZodString) {
          const long = key === 'body' || key === 'blurb' || key === 'description';
          return (
            <div key={key} className="space-y-1.5">
              <Label>{labelize(key)}</Label>
              {long ? (
                <Textarea rows={5} value={(value as string) ?? ''} onChange={(e) => set(key, e.target.value)} />
              ) : (
                <Input value={(value as string) ?? ''} onChange={(e) => set(key, e.target.value)} />
              )}
            </div>
          );
        }
        return null; // arrays/objects need a custom EditorForm
      })}
    </div>
  );
}
