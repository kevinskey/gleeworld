// Two-column layout block. Each column hosts a list of NESTED child
// blocks — real block modules from the registry, stored inline in this
// block's config (NOT as separate gw_site_blocks rows, so the flat
// row model, positions, and publish flow are untouched).
//
// Responsive: side-by-side normally, stacking to one column below
// 640px of CONTAINER width (.gw-columns-section is an inline-size
// container, same pattern as the hero) — so it stacks on real phones
// AND in the builder's narrow phone-preview canvas.
//
// Nesting rules: header (locked chrome), hero (full-bleed), and
// columns itself (no recursion) can't be children. Everything else in
// the registry is fair game and renders/edits through its own module.

import { useState } from 'react';
import { z } from 'zod';
import { Columns2, ChevronDown, ChevronUp, Plus, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutoForm } from '../AutoForm';
import { getBlockModule, BLOCK_LIST } from '../registry';
import { safeConfig } from '../types';
import type { BlockModule, BlockRenderProps, BlockEditorFormProps, SiteRenderContext } from '../types';

const childSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.record(z.unknown()).default({}),
});
type Child = z.infer<typeof childSchema>;

const schema = z.object({
  left: z.array(childSchema).default([]),
  right: z.array(childSchema).default([]),
  /** Which column reads first when stacked to one column. */
  stackOrder: z.enum(['left-first', 'right-first']).default('left-first'),
});
type Config = z.infer<typeof schema>;

const DISALLOWED_CHILDREN = new Set(['header', 'hero', 'columns']);
const uid = () => `col-${Math.random().toString(36).slice(2, 10)}`;

function allowedChildModules(): BlockModule[] {
  return BLOCK_LIST.filter((m) => !DISALLOWED_CHILDREN.has(m.type) && !m.locked);
}

// ── Render ───────────────────────────────────────────────────────────

function ColumnChildren({
  items, side, editable, onPatchChild, ctx,
}: {
  items: Child[];
  side: 'left' | 'right';
  editable: boolean;
  onPatchChild?: (side: 'left' | 'right', id: string, patch: Record<string, unknown>) => void;
  ctx: SiteRenderContext;
}) {
  if (items.length === 0) {
    return editable ? (
      <div className="rounded border border-dashed border-border/70 py-8 text-center text-xs text-muted-foreground">
        Empty column — add blocks in this block's settings.
      </div>
    ) : null;
  }
  return (
    <>
      {items.map((child) => {
        const mod = getBlockModule(child.type);
        if (!mod || DISALLOWED_CHILDREN.has(mod.type)) return null;
        const cfg = safeConfig(mod, child.config);
        return (
          <div key={child.id} className="gw-columns-child min-w-0">
            <mod.Render config={cfg} ctx={ctx}
              onConfigChange={
                onPatchChild
                  ? (patch: Record<string, unknown>) => onPatchChild(side, child.id, patch)
                  : undefined
              }
            />
          </div>
        );
      })}
    </>
  );
}

function Render({ config, onConfigChange, ctx }: BlockRenderProps<Config>) {
  const editable = !!onConfigChange;
  const patchChild = editable
    ? (side: 'left' | 'right', id: string, patch: Record<string, unknown>) => {
        const items = config[side].map((c) =>
          c.id === id ? { ...c, config: { ...c.config, ...patch } } : c,
        );
        onConfigChange?.({ [side]: items } as Partial<Config>);
      }
    : undefined;

  return (
    <section className="gw-columns-section gw-container" style={{ paddingBlock: 'var(--site-section-py, 3rem)' }}>
      <div className={`gw-columns-grid ${config.stackOrder === 'right-first' ? 'gw-columns-right-first' : ''}`}>
        <div className="gw-columns-col min-w-0 space-y-6">
          <ColumnChildren
          ctx={ctx}
          items={config.left} side="left" editable={editable} onPatchChild={patchChild} />
        </div>
        <div className="gw-columns-col min-w-0 space-y-6">
          <ColumnChildren
          ctx={ctx}
          items={config.right} side="right" editable={editable} onPatchChild={patchChild} />
        </div>
      </div>
    </section>
  );
}

// ── Editor form ──────────────────────────────────────────────────────

function ColumnEditor({
  label, items, onChange,
}: {
  label: string;
  items: Child[];
  onChange: (items: Child[]) => void;
}) {
  const [openChild, setOpenChild] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState('');
  const mods = allowedChildModules();

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const [it] = next.splice(idx, 1);
    next.splice(idx + dir, 0, it);
    onChange(next);
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/70 p-3">
      <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">{label}</div>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">No blocks yet — add one below.</p>
      )}
      {items.map((child, idx) => {
        const mod = getBlockModule(child.type);
        if (!mod) return null;
        const open = openChild === child.id;
        const cfg = safeConfig(mod, child.config);
        return (
          <div key={child.id} className="rounded border border-border/70">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <mod.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1 min-w-0 truncate">{mod.name}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Move up">
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === items.length - 1} onClick={() => move(idx, 1)} aria-label="Move down">
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0"
                onClick={() => setOpenChild(open ? null : child.id)}
                aria-label={`${open ? 'Close' : 'Open'} ${mod.name} settings`}
              >
                <Settings2 className={`w-4 h-4 ${open ? 'text-primary' : ''}`} />
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                onClick={() => onChange(items.filter((c) => c.id !== child.id))}
                aria-label={`Remove ${mod.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {open && (
              <div className="border-t border-border/70 p-2">
                {mod.EditorForm ? (
                  <mod.EditorForm
                    config={cfg}
                    onChange={(next) => onChange(items.map((c) => c.id === child.id ? { ...c, config: next as Record<string, unknown> } : c))}
                  />
                ) : (
                  <AutoForm
                    schema={mod.configSchema}
                    config={cfg}
                    onChange={(next) => onChange(items.map((c) => c.id === child.id ? { ...c, config: next as Record<string, unknown> } : c))}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-1">
        <Select value={pendingType} onValueChange={setPendingType}>
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue placeholder="Choose a block…" />
          </SelectTrigger>
          <SelectContent>
            {mods.map((m) => (
              <SelectItem key={m.type} value={m.type}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline" size="sm" className="h-8"
          disabled={!pendingType}
          onClick={() => {
            const mod = getBlockModule(pendingType);
            if (!mod) return;
            onChange([...items, { id: uid(), type: mod.type, config: { ...mod.defaultConfig } }]);
            setPendingType('');
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  return (
    <div className="space-y-4">
      <ColumnEditor label="Left column" items={config.left} onChange={(left) => onChange({ ...config, left })} />
      <ColumnEditor label="Right column" items={config.right} onChange={(right) => onChange({ ...config, right })} />
      <div className="space-y-1.5">
        <Label>On phones, show first</Label>
        <Select value={config.stackOrder} onValueChange={(v) => onChange({ ...config, stackOrder: v as Config['stackOrder'] })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left-first">Left column</SelectItem>
            <SelectItem value="right-first">Right column</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Columns sit side by side on desktop and iPad, and stack into one column on phones.
        </p>
      </div>
    </div>
  );
}

export const columnsBlock: BlockModule<typeof schema> = {
  type: 'columns',
  name: 'Two columns',
  description: 'Side-by-side layout that holds other blocks — stacks to one column on phones.',
  icon: Columns2,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};
