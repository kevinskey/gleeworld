// Event Spotlight — a formal invitation card for a featured event.
//
// Designed as the response leaf beside a poster/flyer image (columns
// block: flyer left, this right): gold letterspaced overline, serif
// display title, then the date set like a concert program under a small
// fermata — the musician's mark for "hold", i.e. hold this date. The
// flyer stays the loud half; this card is the engraved answer to it.
// Tenant-neutral: every line is config.
import { z } from 'zod';
import { CalendarPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  overline: z.string().default('A special evening'),
  title: z.string().default('An Evening in Concert'),
  accentLine: z.string().default('in concert'),
  dayLine: z.string().default('Sunday'),
  dateLine: z.string().default('October 18, 2026'),
  venue: z.string().default(''),
  note: z.string().default('Admission is free — seats are reserved.'),
  ctaLabel: z.string().default('RSVP and reserve seats'),
  ctaUrl: z.string().default('#rsvp'),
  accentColor: z.string().default('#C9A227'),
});
type Config = z.infer<typeof schema>;

/** The fermata: an arc holding a note — "hold this date". */
function Fermata({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 26" width="44" height="24" aria-hidden="true" className="mx-auto">
      <path d="M4 22 A20 20 0 0 1 44 22" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="19" r="3.2" fill={color} />
    </svg>
  );
}

function Render({ config }: BlockRenderProps<Config>) {
  const gold = config.accentColor || '#C9A227';
  return (
    <section className="gw-container h-full flex items-center">
      <div
        className="w-full rounded-sm border px-8 py-14 text-center"
        style={{ background: '#FDFBF6', borderColor: gold, color: '#131722' }}
      >
        {config.overline && (
          <p
            className="text-xs font-semibold uppercase mb-6"
            style={{ color: gold, letterSpacing: '0.28em' }}
          >
            {config.overline}
          </p>
        )}
        <h2
          className="text-4xl cq-sm:text-5xl leading-tight font-bold"
          style={{ fontFamily: 'var(--site-heading-font)' }}
        >
          {/* "X & Friends" breaks before the ampersand — the companion line
              reads as its own gesture (Kevin, 2026-08-13). */}
          {config.title.includes(' & ') ? (
            <>
              {config.title.slice(0, config.title.indexOf(' & '))}
              <span className="block">&amp;{config.title.slice(config.title.indexOf(' & ') + 2)}</span>
            </>
          ) : config.title}
        </h2>
        {config.accentLine && (
          <p className="mt-2 text-2xl italic" style={{ fontFamily: 'var(--site-heading-font)', color: gold }}>
            {config.accentLine}
          </p>
        )}

        <div className="my-9 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1" style={{ background: gold, opacity: 0.5 }} />
          <span className="h-px w-10" style={{ background: gold }} />
          <span className="h-px flex-1" style={{ background: gold, opacity: 0.5 }} />
        </div>

        <Fermata color={gold} />
        <p className="mt-4 text-sm font-semibold uppercase" style={{ letterSpacing: '0.22em' }}>
          {config.dayLine}
        </p>
        <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--site-heading-font)' }}>
          {config.dateLine}
        </p>
        {config.venue && (
          <p className="mt-2 text-lg text-[#5d5a52]">{config.venue}</p>
        )}

        {config.note && (
          <p className="mt-8 text-base text-[#5d5a52]">{config.note}</p>
        )}
        {config.ctaLabel && (
          <a
            href={config.ctaUrl || '#rsvp'}
            className="mt-5 inline-flex items-center gap-2.5 px-10 py-4 text-lg font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: '#131722' }}
          >
            <CalendarPlus className="w-4 h-4" style={{ color: gold }} />
            {config.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const field = (label: string, key: keyof Config) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={String(config[key] ?? '')} onChange={(e) => set({ [key]: e.target.value } as Partial<Config>)} />
    </div>
  );
  return (
    <div className="space-y-4">
      {field('Overline (small gold line)', 'overline')}
      {field('Title', 'title')}
      {field('Accent line (italic)', 'accentLine')}
      {field('Day', 'dayLine')}
      {field('Date', 'dateLine')}
      {field('Venue', 'venue')}
      {field('Note', 'note')}
      {field('Button label', 'ctaLabel')}
      {field('Button link', 'ctaUrl')}
      {field('Accent color', 'accentColor')}
    </div>
  );
}

export const eventSpotlightBlock: BlockModule<typeof schema> = {
  type: 'event-spotlight',
  name: 'Event Card',
  description: 'A formal invitation card for one featured event — overline, title, date under a fermata, RSVP button.',
  icon: CalendarPlus,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};
