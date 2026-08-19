// Workspace Settings > Date card. Type picker + live preview + per-type config.
// Unavailable types render disabled rather than hidden so the add-on stays
// discoverable.
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTenantModules } from '@/hooks/useModuleAccess';
import { useDateCardConfig } from '@/hooks/useDateCardConfig';
import {
  DATE_CARD_LIST,
  getDateCardModule,
  isDateCardAvailable,
  safeDateCardConfig,
  DEFAULT_DATE_CARD_TYPE,
} from './registry';
import { DATE_CARD_TOKENS } from './tokens';
import type { DateCardContext } from './types';

// Character caps mirrored from cards/custom.tsx's Zod schema (eyebrow<=60,
// title/subtitle<=80). Kept here as a display-side belt-and-braces guard —
// the actual limit is enforced by the schema at save time regardless of
// what the input allows the user to type.
const CUSTOM_FIELD_MAX: Record<string, number> = { eyebrow: 60, title: 80, subtitle: 80 };

export function DateCardTabPanel({ canManage }: { canManage: boolean }) {
  const { setting, save } = useDateCardConfig();
  const { data: modules = [] } = useTenantModules();
  const activeAddons = modules.map((m) => m.module_id);

  // Built inside the component (not at module scope) so `now` reflects the
  // moment the panel renders rather than the moment the JS module was first
  // loaded — a long-lived session that crosses midnight would otherwise
  // preview yesterday for the rest of the browser tab's life.
  const previewCtx: DateCardContext = useMemo(() => ({
    now: new Date(),
    firstName: 'Preview',
    ensembleName: 'Your ensemble',
    upNext: {
      id: 'p',
      title: 'Spring Concert',
      detail: 'Main Hall',
      event_at: new Date(Date.now() + 864e5).toISOString(),
    },
    todayRows: [{ id: 'p1', title: 'Rehearsal', detail: null, event_at: new Date().toISOString() }],
  }), []);

  const [type, setType] = useState(setting.type);
  const [config, setConfig] = useState<Record<string, unknown>>(setting.config);
  const [saving, setSaving] = useState(false);

  // Re-sync the form only when the PERSISTED value actually changes, not on
  // every render. `setting` may be a fresh object identity each time (the
  // hook, or a test mock, is free to return a new literal per call) — keying
  // the effect on a serialization of its content keeps that identity churn
  // from re-firing the effect and stomping in-progress local edits.
  const settingKey = `${setting.type}:${JSON.stringify(setting.config)}`;
  useEffect(() => {
    setType(setting.type);
    setConfig(setting.config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingKey]);

  // Live preview: push the pending (type, config) into the query cache so
  // every consumer of useDateCardConfig (DateCardSlot on the home grid,
  // any surface that reads the setting) repaints in real time — same
  // pattern as applyTenantThemeVars for Branding.
  const queryClient = useQueryClient();
  const tenantSlug = typeof window !== 'undefined'
    ? (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant ?? null
    : null;
  useEffect(() => {
    queryClient.setQueryData(['date-card-setting', tenantSlug], {
      v: 1, type, config,
    });
  }, [type, config, tenantSlug, queryClient]);

  // Drop any unsaved preview ONLY on real unmount (route/tab change), not
  // on every dep change of the push-effect above — a per-change cleanup
  // triggers an async refetch that races the next setQueryData call, and
  // if the DB returns the old value first the preview snaps back and the
  // form re-syncs to the stale value (looking "stuck" on the previous
  // pick). Saving invalidates the query itself, so a successful save
  // keeps the preview in place because the DB then matches.
  useEffect(() => {
    return () => {
      void queryClient.invalidateQueries({ queryKey: ['date-card-setting'] });
    };
  }, [queryClient]);

  // Mirror DateCardSlot's availability fallback: if the currently-selected
  // type's add-on has lapsed since it was saved (e.g. liturgy_planner was
  // deactivated), the preview must degrade to the plain card exactly like
  // production does. Without this, an admin previews — and the liturgical
  // card fires a live usccb-readings edge-function call — a card real
  // members never actually see.
  const chosenMod = getDateCardModule(type);
  const mod = chosenMod && isDateCardAvailable(chosenMod, activeAddons)
    ? chosenMod
    : getDateCardModule(DEFAULT_DATE_CARD_TYPE)!;
  const safeConfig = mod === chosenMod ? safeDateCardConfig(mod, config) : mod.defaultConfig;
  const Preview = mod.Render as React.ComponentType<{ config: unknown; ctx: DateCardContext }>;

  const onSave = async () => {
    // Validate against the SELECTED type's own schema — `chosenMod`, not the
    // possibly-different `mod` the preview fell back to when its add-on is
    // unavailable. Save always persists under `type`, so it must be checked
    // against that type's schema regardless of whether it happens to be
    // previewable right now.
    //
    // The inputs below cap length via maxLength, but that's a UX nicety, not
    // a guarantee (paste, IME composition, programmatic value changes all
    // bypass it) — this is the actual gate. Without it, an over-length field
    // would save silently, then safeDateCardConfig's all-or-nothing
    // safeParse would discard every field on the NEXT read and revert to
    // defaults, while the user already saw "Date card updated."
    const validationMod = chosenMod ?? getDateCardModule(DEFAULT_DATE_CARD_TYPE)!;
    const parsed = validationMod.configSchema.safeParse(config);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path?.[0] ? String(issue.path[0]) : 'value';
      const label = field.charAt(0).toUpperCase() + field.slice(1);
      toast.error(`${label}: ${issue?.message ?? 'invalid value'}`);
      return;
    }
    setSaving(true);
    try {
      await save({ v: 1, type, config: parsed.data });
      toast.success('Date card updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the date card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className="border-0 rounded-2xl bg-card"
      style={{ boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)' }}
    >
      <CardContent className="p-4 sm:p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold mb-1">Date card</h3>
          <p className="text-xs text-muted-foreground">
            The card at the top of everyone&apos;s dashboard.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {DATE_CARD_LIST.map((m) => {
            const available = isDateCardAvailable(m, activeAddons);
            const selected = m.type === type;
            return (
              <button
                key={m.type}
                type="button"
                disabled={!canManage || !available}
                onClick={() => {
                  setType(m.type);
                  setConfig(m.defaultConfig as Record<string, unknown>);
                }}
                className={`text-left rounded-xl p-3 border transition-colors ${
                  selected ? 'border-primary' : 'border-border'
                } bg-card disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-2">
                  <m.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{m.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                {!available && (
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Add-on required</p>
                )}
              </button>
            );
          })}
        </div>

        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Preview</Label>
          <div className="mt-2">
            <Preview config={safeConfig} ctx={previewCtx} />
          </div>
        </div>

        {type === 'custom' && (
          <div className="space-y-3">
            {(['eyebrow', 'title', 'subtitle'] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`dc-${field}`} className="text-xs capitalize">
                  {field}
                </Label>
                <Input
                  id={`dc-${field}`}
                  disabled={!canManage}
                  maxLength={CUSTOM_FIELD_MAX[field]}
                  value={String((config as Record<string, unknown>)[field] ?? '')}
                  onChange={(e) => setConfig({ ...config, [field]: e.target.value })}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Tokens: {DATE_CARD_TOKENS.map((t) => `{{${t}}}`).join(' · ')}
            </p>
          </div>
        )}

        {canManage && (
          <div className="flex justify-end pt-2">
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
