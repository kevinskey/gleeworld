// Audition block — public-site variant for tenants that hold formal
// auditions (choir chair auditions, program admissions, invitational
// showcases). Same design language as the Appointment Booking block so
// the two live side-by-side coherently:
//   • serif headline + eyebrow + intro pitch on the left
//   • gradient CTA card anchoring the pitch column
//   • right column stack: session banner, numbered "what to prepare"
//     tile-cards with colored icon pills, and "openings" pills
// Ships with a rich default config so a tenant sees a polished section
// the moment they drop the block in.

import { z } from 'zod';
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowRight,
  Music,
  CalendarDays,
  MapPin,
  Clock,
  Sparkles,
  Book,
  Mic,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  eyebrow: z.string().default('Now casting'),
  heading: z.string().default('Auditions'),
  intro: z.string().default(
    'We are hearing new voices for the coming season. Prepare the items below, arrive ten minutes early, and bring a copy of your music for the accompanist.',
  ),
  signupUrl: z.string().default(''),
  ctaLabel: z.string().default('Sign up to audition'),
  ctaFootnote: z.string().default('Slots fill quickly — reserve yours.'),
  session: z
    .object({
      dateLabel: z.string().default(''),
      timeLabel: z.string().default(''),
      location: z.string().default(''),
    })
    .default({ dateLabel: '', timeLabel: '', location: '' }),
  requirements: z
    .array(
      z.object({
        title: z.string().default(''),
        detail: z.string().default(''),
      }),
    )
    .default([]),
  parts: z.array(z.string()).default([]),
});
type Config = z.infer<typeof schema>;

// Deterministic icon per requirement row so the numbered list looks
// intentional. Cycles through four music-education glyphs.
const REQUIREMENT_ICONS = [Book, Mic, ListChecks, Sparkles] as const;

function Render({ config }: BlockRenderProps<Config>) {
  const hasSession = !!(
    config.session.dateLabel ||
    config.session.timeLabel ||
    config.session.location
  );
  const requirements = config.requirements.filter((r) => r.title);
  const parts = config.parts.filter(Boolean);
  const noContent =
    !config.heading &&
    !config.signupUrl &&
    !hasSession &&
    requirements.length === 0 &&
    parts.length === 0;
  if (noContent) return null;

  return (
    <section id="auditions" className="max-w-6xl mx-auto w-full">
      <div className="px-4 cq-sm:px-6 py-10 cq-sm:py-14">
        {/* `cq-*` (container queries against `.gw-site`), not `sm:`/`lg:`, so
            the builder's phone preview stacks like a phone instead of laying
            out for the editor's viewport and overflowing the 390px frame.
            `min-w-0` on both columns: grid items default to `min-width: auto`,
            which lets a long location line or requirement title push the
            column past its `fr` share and widen the whole section. */}
        <div className="grid gap-8 cq-lg:gap-12 cq-lg:grid-cols-[5fr_7fr]">
          {/* Left column — editorial pitch + CTA card */}
          <div className="flex flex-col min-w-0">
            {config.eyebrow && (
              <div
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-semibold mb-4 self-start"
                style={{ color: 'var(--site-accent)' }}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                {config.eyebrow}
              </div>
            )}
            {config.heading && (
              <h2
                className="normal-case text-3xl cq-sm:text-4xl cq-lg:text-5xl font-bold leading-[1.05] tracking-tight mb-4 break-words"
                style={{ fontFamily: 'var(--site-heading-font, "Playfair Display", Georgia, serif)' }}
              >
                {config.heading}
              </h2>
            )}
            {config.intro && (
              <p className="text-base cq-sm:text-lg text-muted-foreground leading-relaxed mb-6 max-w-xl">
                {config.intro}
              </p>
            )}
            {config.signupUrl && (
              <div
                className="mt-auto rounded-2xl p-5 cq-sm:p-6 shadow-lg border"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in oklab, var(--site-accent) 96%, black 4%) 0%, var(--site-accent) 100%)',
                  borderColor: 'color-mix(in oklab, var(--site-accent) 40%, black 60%)',
                  color: 'white',
                }}
              >
                <div className="text-xs uppercase tracking-widest opacity-80 mb-2">
                  Ready to audition?
                </div>
                <div className="text-xl cq-sm:text-2xl font-semibold mb-4">
                  Reserve your slot
                </div>
                <a
                  href={config.signupUrl}
                  target={config.signupUrl.startsWith('http') ? '_blank' : undefined}
                  rel={config.signupUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-shadow"
                  style={{ color: 'var(--site-accent)' }}
                >
                  {config.ctaLabel || 'Sign up to audition'} <ArrowRight className="w-4 h-4" />
                </a>
                {config.ctaFootnote && (
                  <p className="text-xs mt-3 opacity-85">{config.ctaFootnote}</p>
                )}
              </div>
            )}
          </div>

          {/* Right column — session banner + requirements + openings */}
          <div className="space-y-6 min-w-0">
            {hasSession && (
              <div
                className="rounded-2xl p-4 cq-sm:p-5 border grid grid-cols-1 cq-sm:grid-cols-3 gap-3 cq-sm:gap-4"
                style={{
                  background: 'color-mix(in oklab, var(--site-accent) 6%, transparent)',
                  borderColor: 'color-mix(in oklab, var(--site-accent) 24%, transparent)',
                }}
              >
                {config.session.dateLabel && (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0"
                      style={{
                        background: 'color-mix(in oklab, var(--site-accent) 14%, transparent)',
                        color: 'var(--site-accent)',
                      }}
                    >
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Date
                      </div>
                      <div className="font-semibold text-sm">{config.session.dateLabel}</div>
                    </div>
                  </div>
                )}
                {config.session.timeLabel && (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0"
                      style={{
                        background: 'color-mix(in oklab, var(--site-accent) 14%, transparent)',
                        color: 'var(--site-accent)',
                      }}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Time
                      </div>
                      <div className="font-semibold text-sm">{config.session.timeLabel}</div>
                    </div>
                  </div>
                )}
                {config.session.location && (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0"
                      style={{
                        background: 'color-mix(in oklab, var(--site-accent) 14%, transparent)',
                        color: 'var(--site-accent)',
                      }}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Location
                      </div>
                      <div className="font-semibold text-sm break-words">
                        {config.session.location}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {requirements.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">
                  What to prepare
                </div>
                <ol className="space-y-3">
                  {requirements.map((r, i) => {
                    const Icon = REQUIREMENT_ICONS[i % REQUIREMENT_ICONS.length];
                    return (
                      <li
                        key={i}
                        className="rounded-2xl border border-border bg-card p-5 flex gap-4 items-start hover:shadow-md transition-shadow"
                      >
                        <div className="relative shrink-0">
                          <div
                            className="w-11 h-11 rounded-xl inline-flex items-center justify-center"
                            style={{
                              background: 'color-mix(in oklab, var(--site-accent) 12%, transparent)',
                              color: 'var(--site-accent)',
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <span
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold inline-flex items-center justify-center shadow-sm"
                            style={{ background: 'var(--site-accent)' }}
                          >
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg normal-case leading-snug break-words">
                            {r.title}
                          </div>
                          {r.detail && (
                            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                              {r.detail}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {parts.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">
                  Openings
                </div>
                <div className="flex flex-wrap gap-2">
                  {parts.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold border"
                      style={{
                        background: 'color-mix(in oklab, var(--site-accent) 10%, transparent)',
                        borderColor: 'color-mix(in oklab, var(--site-accent) 28%, transparent)',
                        color: 'var(--site-accent)',
                      }}
                    >
                      <Music className="w-3.5 h-3.5" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const setSession = (patch: Partial<Config['session']>) =>
    set({ session: { ...config.session, ...patch } });
  const updateReq = (i: number, patch: Partial<Config['requirements'][number]>) =>
    set({ requirements: config.requirements.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const removeReq = (i: number) =>
    set({ requirements: config.requirements.filter((_, j) => j !== i) });
  const addReq = () =>
    set({ requirements: [...config.requirements, { title: '', detail: '' }] });
  const updatePart = (i: number, value: string) =>
    set({ parts: config.parts.map((p, j) => (j === i ? value : p)) });
  const removePart = (i: number) => set({ parts: config.parts.filter((_, j) => j !== i) });
  const addPart = () => set({ parts: [...config.parts, ''] });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
        <div className="space-y-1.5">
          <Label>Eyebrow</Label>
          <Input value={config.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} placeholder="Now casting" />
        </div>
        <div className="space-y-1.5">
          <Label>Section heading</Label>
          <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Intro paragraph</Label>
        <Textarea
          value={config.intro}
          onChange={(e) => set({ intro: e.target.value })}
          placeholder="A short paragraph about the program, level, or year the audition is for."
          rows={3}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Audition session (optional)
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            value={config.session.dateLabel}
            onChange={(e) => setSession({ dateLabel: e.target.value })}
            placeholder="Sat, Aug 24"
          />
          <Input
            value={config.session.timeLabel}
            onChange={(e) => setSession({ timeLabel: e.target.value })}
            placeholder="10am–2pm"
          />
          <Input
            value={config.session.location}
            onChange={(e) => setSession({ location: e.target.value })}
            placeholder="Music Building, Rm 210"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label>Sign-up link</Label>
          <Input
            value={config.signupUrl}
            onChange={(e) => set({ signupUrl: e.target.value })}
            placeholder="/auditions or https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>CTA label</Label>
          <Input
            value={config.ctaLabel}
            onChange={(e) => set({ ctaLabel: e.target.value })}
            placeholder="Sign up to audition"
          />
        </div>
        <div className="space-y-1.5">
          <Label>CTA footnote</Label>
          <Input
            value={config.ctaFootnote}
            onChange={(e) => set({ ctaFootnote: e.target.value })}
            placeholder="Slots fill quickly."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>What to prepare</Label>
        {config.requirements.length === 0 && (
          <p className="text-xs text-slate-500">
            Numbered checklist for applicants — repertoire, scales, sight-reading passage, form to bring, etc.
          </p>
        )}
        {config.requirements.map((r, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 flex-1">Requirement {i + 1}</span>
              <button
                type="button"
                onClick={() => removeReq(i)}
                className="text-slate-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={r.title}
              onChange={(e) => updateReq(i, { title: e.target.value })}
              placeholder="One prepared piece"
              className="h-8 text-sm"
            />
            <Textarea
              value={r.detail}
              onChange={(e) => updateReq(i, { detail: e.target.value })}
              placeholder="Any style, memorized preferred. Bring a copy for the accompanist."
              rows={2}
              className="text-sm"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addReq} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add requirement
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Openings (voice parts / instruments)</Label>
        {config.parts.length === 0 && (
          <p className="text-xs text-slate-500">
            Short pills listing what the program is filling — Soprano, Alto, Tenor, Bass, Piano, etc.
          </p>
        )}
        {config.parts.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={p}
              onChange={(e) => updatePart(i, e.target.value)}
              placeholder="Soprano"
              className="h-8 text-sm"
            />
            <button
              type="button"
              onClick={() => removePart(i)}
              className="text-slate-400 hover:text-red-600"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addPart} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add opening
        </Button>
      </div>
    </div>
  );
}

export const auditionBlock: BlockModule<typeof schema> = {
  type: 'audition',
  name: 'Audition',
  description: 'Announce an audition — session date, what to prepare, openings, and a sign-up link.',
  icon: ClipboardList,
  tier: 'free',
  group: 'core',
  poweredBy: 'Auditions',
  configSchema: schema,
  // Rich default config so a tenant drop-in shows a polished, working
  // section instantly — with a session banner, four typical requirements,
  // full SATB openings, and a live CTA. Copy is generic but on-brand for
  // a music program.
  defaultConfig: {
    eyebrow: 'Now casting',
    heading: 'Auditions for the season',
    intro:
      'We are hearing new voices for the coming season. Prepare the items below, arrive ten minutes early, and bring a copy of your music for the accompanist.',
    signupUrl: '/auditions',
    ctaLabel: 'Sign up to audition',
    ctaFootnote: 'Slots fill quickly — reserve yours.',
    session: {
      dateLabel: 'Sat, Aug 24',
      timeLabel: '10am – 2pm',
      location: 'Music Building, Rm 210',
    },
    requirements: [
      {
        title: 'One prepared piece',
        detail:
          'Any style, three minutes or fewer. Memorized preferred. Bring a copy for the accompanist.',
      },
      {
        title: 'Vocal exercises',
        detail:
          'Scales and arpeggios through your range. We will guide you — no need to prep this cold.',
      },
      {
        title: 'Sight-singing',
        detail:
          'A brief passage in a major or minor key. Solfège is welcome; letter names are fine too.',
      },
      {
        title: 'A short interview',
        detail:
          'Two or three questions about your background, musical goals, and availability for rehearsals.',
      },
    ],
    parts: ['Soprano', 'Alto', 'Tenor', 'Bass', 'Piano / accompanist'],
  },
  EditorForm,
  Render,
};
