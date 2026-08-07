import { z } from 'zod';
import { Church } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Liturgical season'),
  tradition: z.enum(['catholic', 'anglican', 'lutheran', 'methodist', 'orthodox']).default('catholic'),
  // Show the next N upcoming feast days. 0 hides the upcoming list.
  upcomingCount: z.number().int().min(0).max(12).default(5),
  // Show a tenant-authored note attached to the current season (planning
  // reminders, repertoire focus, etc.).
  showNote: z.boolean().default(false),
  note: z.string().default(''),
});
type Config = z.infer<typeof schema>;

// ─── Liturgical date math ───────────────────────────────────────────────
//
// Western Christian liturgical year. Built on three anchors:
//   • Christmas         — fixed Dec 25
//   • Easter            — Gauss's computus (floating)
//   • First Advent      — 4 Sundays before Christmas
// Everything else is offset from one of these. Greek Orthodox dates differ
// (Julian calendar) and aren't computed here — pick `orthodox` tradition
// and you get the Western fall-back with a heads-up label.

function computeEaster(year: number): Date {
  // Anonymous Gregorian algorithm (Meeus / Jones / Butcher).
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

// Nth occurrence of a weekday in a given month. weekday is 0 (Sun) .. 6 (Sat).
function nthWeekdayOf(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7));
}

// First Sunday of Advent: the Sunday closest to Nov 30 (i.e., 4th Sunday
// before Christmas). Always between Nov 27 and Dec 3.
function firstAdvent(year: number): Date {
  const christmas = new Date(Date.UTC(year, 11, 25)); // Dec 25
  const back = (christmas.getUTCDay() + 21) % 7 + 21; // 21-27 days back to Sunday
  return addDays(christmas, -back + (christmas.getUTCDay() === 0 ? 0 : 0));
}

interface Feast {
  date: Date;
  name: string;
  /** Tailwind background tint for the chip when displayed. */
  color: 'purple' | 'pink' | 'red' | 'white' | 'green' | 'gold' | 'black';
  /** True for movable feasts (driven by Easter). */
  movable?: boolean;
}

// All major moveable + fixed feasts for a given liturgical year (centered on
// the Easter of `year`, so we also pull in fixed feasts from year and year+1
// to cover the cycle that ends with Christ the King in late November).
function feastsForYear(year: number): Feast[] {
  const easter = computeEaster(year);
  const advent = firstAdvent(year);

  const out: Feast[] = [
    // Christmas + Epiphany cycle (start of Western liturgical year before this Easter)
    { date: new Date(Date.UTC(year - 1, 11, 25)), name: 'Christmas Day', color: 'gold' },
    { date: new Date(Date.UTC(year, 0, 1)), name: 'Mary, Mother of God', color: 'white' },
    { date: new Date(Date.UTC(year, 0, 6)), name: 'Epiphany', color: 'white' },

    // Lent
    { date: addDays(easter, -46), name: 'Ash Wednesday', color: 'purple', movable: true },
    { date: addDays(easter, -7), name: 'Palm Sunday', color: 'red', movable: true },
    { date: addDays(easter, -3), name: 'Holy Thursday', color: 'white', movable: true },
    { date: addDays(easter, -2), name: 'Good Friday', color: 'red', movable: true },
    { date: addDays(easter, -1), name: 'Holy Saturday', color: 'black', movable: true },

    // Easter cycle
    { date: easter, name: 'Easter Sunday', color: 'gold', movable: true },
    { date: addDays(easter, 39), name: 'Ascension of the Lord', color: 'white', movable: true },
    { date: addDays(easter, 49), name: 'Pentecost', color: 'red', movable: true },
    { date: addDays(easter, 56), name: 'Trinity Sunday', color: 'white', movable: true },
    { date: addDays(easter, 60), name: 'Corpus Christi', color: 'white', movable: true },

    // Fixed solemnities later in the calendar year
    { date: new Date(Date.UTC(year, 7, 15)), name: 'Assumption of Mary', color: 'white' },
    { date: new Date(Date.UTC(year, 10, 1)), name: 'All Saints', color: 'white' },
    { date: new Date(Date.UTC(year, 10, 2)), name: 'All Souls', color: 'purple' },

    // Christ the King (last Sunday of liturgical year) + Advent + next Christmas
    { date: addDays(advent, -7), name: 'Christ the King', color: 'white' },
    { date: advent, name: 'First Sunday of Advent', color: 'purple' },
    { date: addDays(advent, 14), name: 'Gaudete Sunday (3rd Advent)', color: 'pink' },
    { date: new Date(Date.UTC(year, 11, 24)), name: 'Christmas Eve', color: 'gold' },
    { date: new Date(Date.UTC(year, 11, 25)), name: 'Christmas Day', color: 'gold' },
  ];
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}

interface SeasonInfo {
  name: string;
  color: Feast['color'];
  /** Subtitle/description shown under the season name. */
  blurb: string;
}

// What liturgical season is `today` in? Walks the year's anchors and picks
// the band the date falls into.
function seasonOn(today: Date): SeasonInfo {
  const y = today.getUTCFullYear();
  const easter = computeEaster(y);
  const easterPrev = computeEaster(y - 1);
  const ashWed = addDays(easter, -46);
  const pentecost = addDays(easter, 49);
  const advent = firstAdvent(y);
  const adventPrev = firstAdvent(y - 1);
  const christmasPrev = new Date(Date.UTC(y - 1, 11, 25));
  const baptismOfLord = nthWeekdayOf(y, 0, 0, 2); // Sunday after Jan 6
  const t = today.getTime();

  if (t >= advent.getTime() || (t >= adventPrev.getTime() && t < christmasPrev.getTime())) {
    return {
      name: 'Advent',
      color: 'purple',
      blurb: 'Season of expectant waiting and preparation for the celebration of the Nativity.',
    };
  }
  if (t >= christmasPrev.getTime() && t < baptismOfLord.getTime()) {
    return { name: 'Christmas', color: 'gold', blurb: 'Celebration of the Incarnation — Christ is born.' };
  }
  if (t >= ashWed.getTime() && t < easter.getTime()) {
    return { name: 'Lent', color: 'purple', blurb: 'Forty days of penitence, prayer, and almsgiving leading to Easter.' };
  }
  if (t >= easter.getTime() && t < pentecost.getTime()) {
    return { name: 'Easter', color: 'gold', blurb: 'Fifty days celebrating the Resurrection — alleluia is restored.' };
  }
  if (t >= pentecost.getTime() && t < advent.getTime()) {
    return { name: 'Ordinary Time', color: 'green', blurb: 'The growth of the Church between Pentecost and Advent.' };
  }
  // Between Baptism of the Lord and Ash Wednesday
  if (t >= easterPrev.getTime() && t < ashWed.getTime()) {
    return { name: 'Ordinary Time', color: 'green', blurb: 'The growth of the Church between Christmas and Lent.' };
  }
  return { name: 'Ordinary Time', color: 'green', blurb: 'The growth of the Church.' };
}

const COLOR_STYLES: Record<Feast['color'], { bg: string; fg: string; chip: string; label: string }> = {
  purple: { bg: '#5b2c8e', fg: '#ffffff', chip: 'bg-purple-100 text-purple-900', label: 'Purple' },
  pink: { bg: '#e988bf', fg: '#3a1431', chip: 'bg-pink-100 text-pink-900', label: 'Rose / Pink' },
  red: { bg: '#a3151a', fg: '#ffffff', chip: 'bg-red-100 text-red-900', label: 'Red' },
  white: { bg: '#f8f8f5', fg: '#222', chip: 'bg-slate-100 text-slate-900', label: 'White' },
  gold: { bg: '#b88a2c', fg: '#ffffff', chip: 'bg-amber-100 text-amber-900', label: 'White / Gold' },
  green: { bg: '#2d6b3f', fg: '#ffffff', chip: 'bg-emerald-100 text-emerald-900', label: 'Green' },
  black: { bg: '#1a1a1a', fg: '#ffffff', chip: 'bg-slate-200 text-slate-900', label: 'No vestments' },
};

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function Render({ config }: BlockRenderProps<Config>) {
  const today = new Date();
  const season = seasonOn(today);
  const seasonStyle = COLOR_STYLES[season.color];

  // Get the next N feasts AFTER today, looking through this year and next so
  // we don't drop off in November/December.
  const candidates = [...feastsForYear(today.getUTCFullYear()), ...feastsForYear(today.getUTCFullYear() + 1)];
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const upcoming = candidates
    .filter((f) => f.date.getTime() >= todayUtc)
    // Dedupe by date+name (Christmas appears in both year buckets above).
    .filter((f, i, arr) => arr.findIndex((g) => g.date.getTime() === f.date.getTime() && g.name === f.name) === i)
    .slice(0, config.upcomingCount);

  const isOrthodox = config.tradition === 'orthodox';

  return (
    <section id="liturgical" className="gw-container py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <Church className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {isOrthodox && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
          Note: this block shows the Western (Gregorian) liturgical year. Eastern Orthodox dates (Julian) aren&apos;t computed here yet.
        </p>
      )}

      {/* Current season card */}
      <div
        className="rounded-2xl p-6 cq-sm:p-8 shadow-md mb-5"
        style={{ background: seasonStyle.bg, color: seasonStyle.fg }}
      >
        <div className="text-xs uppercase tracking-[0.18em] opacity-80 mb-1">Current season</div>
        <h3 className="text-3xl cq-sm:text-4xl font-bold normal-case mb-2">{season.name}</h3>
        <p className="text-sm cq-sm:text-base opacity-90 max-w-2xl leading-relaxed">{season.blurb}</p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
          <span className="inline-block w-3 h-3 rounded-full border border-white/40" style={{ background: seasonStyle.bg }} />
          Liturgical color: {seasonStyle.label}
        </div>
      </div>

      {config.showNote && config.note && (
        <div className="rounded-xl border border-border bg-card p-4 mb-5">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{config.note}</p>
        </div>
      )}

      {/* Upcoming feasts */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm uppercase tracking-wide font-semibold text-muted-foreground mb-3">
            Upcoming feast days
          </h3>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {upcoming.map((f, i) => {
              const c = COLOR_STYLES[f.color];
              return (
                <li key={`${f.name}-${i}`} className="flex items-center gap-4 p-4">
                  <div className="text-center shrink-0 w-16">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {f.date.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}
                    </div>
                    <div className="text-2xl font-bold tabular-nums leading-tight">
                      {f.date.getUTCDate()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold normal-case">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(f.date)} · {f.movable ? 'movable' : 'fixed'}
                    </div>
                  </div>
                  <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full font-semibold ${c.chip}`}>
                    {c.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} placeholder="Liturgical season" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tradition</Label>
          <Select value={config.tradition} onValueChange={(v) => set({ tradition: v as Config['tradition'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="catholic">Roman Catholic</SelectItem>
              <SelectItem value="anglican">Anglican / Episcopal</SelectItem>
              <SelectItem value="lutheran">Lutheran</SelectItem>
              <SelectItem value="methodist">Methodist</SelectItem>
              <SelectItem value="orthodox">Eastern Orthodox</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Upcoming feasts to show</Label>
          <Input
            type="number"
            min={0}
            max={12}
            value={config.upcomingCount}
            onChange={(e) => set({ upcomingCount: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })}
          />
        </div>
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={config.showNote} onCheckedChange={(v) => set({ showNote: v === true })} />
          <span className="font-medium">Show a planning note</span>
        </label>
        {config.showNote && (
          <Textarea
            value={config.note}
            onChange={(e) => set({ note: e.target.value })}
            rows={3}
            placeholder="Repertoire focus for the season, rehearsal notes, what the choir is preparing…"
            className="text-sm"
          />
        )}
      </div>
      <p className="text-sm text-slate-500">
        Season + feast dates are computed automatically from Easter — no upkeep required.
      </p>
    </div>
  );
}

export const liturgicalCalendarBlock: BlockModule<typeof schema> = {
  type: 'liturgical-calendar',
  name: 'Liturgical Calendar',
  description: 'Current liturgical season + upcoming feast days. Auto-computed each year — no upkeep.',
  icon: Church,
  tier: 'free',
  group: 'gleeworld',
  poweredBy: 'Liturgical Planner',
  configSchema: schema,
  defaultConfig: {
    heading: 'Liturgical season',
    tradition: 'catholic',
    upcomingCount: 5,
    showNote: false,
    note: '',
  },
  EditorForm,
  Render,
};
