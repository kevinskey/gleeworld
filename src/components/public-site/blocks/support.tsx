import { z } from 'zod';
import { HeartHandshake, Plus, Trash2, GripVertical, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Support our program'),
  intro: z.string().default(''),
  campaign: z.object({
    name: z.string().default(''),
    blurb: z.string().default(''),
    progressLabel: z.string().default(''),
    progressPercent: z.number().min(0).max(100).default(0),
    ctaLabel: z.string().default('Give a gift'),
    ctaUrl: z.string().default(''),
  }).default({ name: '', blurb: '', progressLabel: '', progressPercent: 0, ctaLabel: 'Give a gift', ctaUrl: '' }),
  sponsorsHeading: z.string().default('Our sponsors'),
  sponsors: z.array(z.object({
    name: z.string().default(''),
    logoUrl: z.string().default(''),
    url: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
  const sponsors = config.sponsors.filter((s) => s.name || s.logoUrl);
  const showCampaign = !!(config.campaign.name || config.campaign.blurb || config.campaign.ctaUrl);
  if (!showCampaign && sponsors.length === 0) return null;
  const pct = Math.max(0, Math.min(100, config.campaign.progressPercent ?? 0));
  return (
    <section id="support" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <HeartHandshake className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.intro && <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>}

      {showCampaign && (
        <div className="rounded-xl border border-border bg-card p-6 mb-10">
          {config.campaign.name && (
            <h3 className="text-xl font-semibold normal-case mb-2">{config.campaign.name}</h3>
          )}
          {config.campaign.blurb && (
            <p className="text-muted-foreground leading-relaxed">{config.campaign.blurb}</p>
          )}
          {pct > 0 && (
            <div className="mt-4 space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: 'var(--site-accent)' }}
                />
              </div>
              {config.campaign.progressLabel && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{config.campaign.progressLabel}</span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
              )}
            </div>
          )}
          {config.campaign.ctaUrl && (
            <a
              href={config.campaign.ctaUrl}
              className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-white font-medium"
              style={{ background: 'var(--site-accent)' }}
            >
              {config.campaign.ctaLabel || 'Give a gift'} <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {sponsors.length > 0 && (
        <div>
          {config.sponsorsHeading && (
            <h3 className="text-sm uppercase tracking-wide font-semibold text-muted-foreground mb-4 text-center">
              {config.sponsorsHeading}
            </h3>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {sponsors.map((s, i) => {
              const inner = s.logoUrl ? (
                <img src={s.logoUrl} alt={s.name} className="h-10 sm:h-14 w-auto object-contain grayscale hover:grayscale-0 transition" />
              ) : (
                <span className="font-medium text-muted-foreground">{s.name}</span>
              );
              return s.url ? (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.name}>{inner}</a>
              ) : (
                <div key={i} title={s.name}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const setCampaign = (patch: Partial<Config['campaign']>) =>
    set({ campaign: { ...config.campaign, ...patch } });
  const updateSponsor = (i: number, patch: Partial<Config['sponsors'][number]>) =>
    set({ sponsors: config.sponsors.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const removeSponsor = (i: number) =>
    set({ sponsors: config.sponsors.filter((_, j) => j !== i) });
  const addSponsor = () =>
    set({ sponsors: [...config.sponsors, { name: '', logoUrl: '', url: '' }] });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Intro (optional)</Label>
        <Textarea value={config.intro} onChange={(e) => set({ intro: e.target.value })} rows={2} />
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">Campaign (optional)</div>
        <Input
          value={config.campaign.name}
          onChange={(e) => setCampaign({ name: e.target.value })}
          placeholder="Campaign name (e.g. 2026 Spring Tour Fund)"
          className="h-8 text-sm"
        />
        <Textarea
          value={config.campaign.blurb}
          onChange={(e) => setCampaign({ blurb: e.target.value })}
          placeholder="A short pitch."
          rows={2}
          className="text-sm"
        />
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <Input
            value={config.campaign.progressLabel}
            onChange={(e) => setCampaign({ progressLabel: e.target.value })}
            placeholder='Progress label (e.g. "$18,400 of $25,000")'
            className="h-8 text-sm"
          />
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.campaign.progressPercent}
              onChange={(e) => setCampaign({ progressPercent: Number(e.target.value) })}
              className="w-24 accent-sky-600"
            />
            <span className="text-xs text-slate-500 tabular-nums w-10 text-right">
              {config.campaign.progressPercent}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={config.campaign.ctaLabel}
            onChange={(e) => setCampaign({ ctaLabel: e.target.value })}
            placeholder="Button label"
            className="h-8 text-sm"
          />
          <Input
            value={config.campaign.ctaUrl}
            onChange={(e) => setCampaign({ ctaUrl: e.target.value })}
            placeholder="https://… or #donations"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Input
          value={config.sponsorsHeading}
          onChange={(e) => set({ sponsorsHeading: e.target.value })}
          placeholder="Sponsors section heading"
          className="h-8 text-sm"
        />
        <Label>Sponsors</Label>
        {config.sponsors.length === 0 && (
          <p className="text-xs text-slate-500">Logos of program sponsors, foundations, or partners.</p>
        )}
        {config.sponsors.map((s, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 flex-1">Sponsor {i + 1}</span>
              <button
                type="button"
                onClick={() => removeSponsor(i)}
                className="text-slate-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <ImageUploadField
              label=""
              prefix="sponsor"
              thumbClass="w-20 h-10"
              value={s.logoUrl}
              onChange={(url) => updateSponsor(i, { logoUrl: url })}
              buttonColor={theme?.primaryColor}
            />
            <Input
              value={s.name}
              onChange={(e) => updateSponsor(i, { name: e.target.value })}
              placeholder="Sponsor name"
              className="h-8 text-sm"
            />
            <Input
              value={s.url}
              onChange={(e) => updateSponsor(i, { url: e.target.value })}
              placeholder="https://… (optional link)"
              className="h-8 text-sm"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addSponsor} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add sponsor
        </Button>
      </div>
    </div>
  );
}

export const supportBlock: BlockModule<typeof schema> = {
  type: 'support',
  name: 'Support Our Program',
  description: 'A campaign pitch with progress bar plus a sponsor / partner logo wall.',
  icon: HeartHandshake,
  tier: 'free',
  group: 'gleeworld',
  poweredBy: 'Give Back',
  configSchema: schema,
  defaultConfig: {
    heading: 'Support our program',
    intro: '',
    campaign: { name: '', blurb: '', progressLabel: '', progressPercent: 0, ctaLabel: 'Give a gift', ctaUrl: '' },
    sponsorsHeading: 'Our sponsors',
    sponsors: [],
  },
  EditorForm,
  Render,
};
