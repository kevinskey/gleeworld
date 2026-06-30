// Catholic liturgical calendar utility.
//
// All dates are returned in local time (no UTC drift) so a tenant in
// Eastern time and a tenant on the West Coast both see Easter on the
// same calendar Sunday.
//
// Coverage in v1:
//   - Easter Sunday (Gauss / Anonymous algorithm, Gregorian)
//   - Movable feasts derived from Easter (Ash Wed, Palm Sun, Good Fri,
//     Pentecost, Trinity Sun, Corpus Christi US, Christ the King)
//   - First Sunday of Advent (Sunday closest to Nov 30)
//   - Fixed solemnities (Christmas, Immaculate Conception, Assumption,
//     All Saints, Solemnity of Mary)
//   - Liturgical season label for any given date
//   - Sunday Cycle A/B/C resolver (changes at First Sunday of Advent)
//
// Deferred to v2: full saints calendar, weekday I/II cycle, lectionary
// readings full-text.

export type SundayCycle = 'A' | 'B' | 'C';
export type LiturgicalSeason =
  | 'Advent'
  | 'Christmas'
  | 'Ordinary Time'
  | 'Lent'
  | 'Easter';

export interface LiturgicalDay {
  /** Year of the *calendar* date (not the liturgical year). */
  year: number;
  /** Year of the active liturgical year that contains this date. */
  liturgicalYear: number;
  cycle: SundayCycle;
  season: LiturgicalSeason;
  /** Free-text label if this date matches a solemnity/feast.
   * Null if it's a non-feast weekday or generic Sunday in Ordinary Time. */
  observation: string | null;
}

// ── Easter (Gauss algorithm for the Gregorian calendar) ──────────────

export function easterDate(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ── Date math helpers (local-time) ───────────────────────────────────

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function sameYMD(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sundayOnOrBefore(d: Date): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function sundayOnOrAfter(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay();
  if (dow !== 0) out.setDate(out.getDate() + (7 - dow));
  return out;
}

/** Sunday closest to Nov 30 (any year). Range Nov 27 – Dec 3. */
export function firstSundayOfAdvent(year: number): Date {
  const nov30 = new Date(year, 10, 30); // Nov is month 10
  const dow = nov30.getDay(); // 0..6
  // If Nov 30 is a Sunday it IS the first Sunday of Advent; otherwise
  // pick whichever Sunday it's nearer to (the Sunday on or after Nov 27).
  const offsetToNearestSunday = dow === 0 ? 0 : dow <= 3 ? -dow : 7 - dow;
  const out = new Date(nov30);
  out.setDate(out.getDate() + offsetToNearestSunday);
  return out;
}

// ── Sunday Cycle A/B/C resolver ──────────────────────────────────────

/** The liturgical year containing `d`. Liturgical year 2026 = the year
 * that begins on the First Sunday of Advent 2025 and ends with Christ
 * the King in November 2026. */
export function liturgicalYearOf(d: Date): number {
  const advent = firstSundayOfAdvent(d.getFullYear());
  return d >= advent ? d.getFullYear() + 1 : d.getFullYear();
}

/** Returns 'A' | 'B' | 'C' for the Sunday Cycle of the liturgical year
 * containing the given date. Year A = Matthew, B = Mark, C = Luke. */
export function sundayCycle(d: Date): SundayCycle {
  const lyear = liturgicalYearOf(d);
  // 2023 = A, 2024 = B, 2025 = C, 2026 = A, ... (mod 3 mapping)
  return (['C', 'A', 'B'] as const)[lyear % 3];
}

// ── Major movable + fixed observations ───────────────────────────────

interface FeastEntry {
  date: Date;
  name: string;
  season?: LiturgicalSeason;
}

/** Build the full feast / solemnity list for one civil year. Includes
 * everything we auto-fill into the observation field when the user
 * creates a Mass on a matching date. */
export function liturgicalFeasts(year: number): FeastEntry[] {
  const easter = easterDate(year);
  const advent1 = firstSundayOfAdvent(year);
  const palmSunday = addDays(easter, -7);
  const ashWednesday = addDays(easter, -46);
  const goodFriday = addDays(easter, -2);
  const easterVigil = addDays(easter, -1);
  const ascension = addDays(easter, 39); // Thursday — many US dioceses transfer to Sunday
  const pentecost = addDays(easter, 49);
  const trinity = addDays(easter, 56);
  const corpusChristi = addDays(easter, 63); // US: Sunday after Trinity
  const sacredHeart = addDays(easter, 68);
  // Christ the King = Sunday before First Sunday of Advent
  const christTheKing = addDays(advent1, -7);

  return [
    // ── Advent
    { date: advent1, name: 'First Sunday of Advent', season: 'Advent' },
    { date: addDays(advent1, 7), name: 'Second Sunday of Advent', season: 'Advent' },
    { date: addDays(advent1, 14), name: 'Third Sunday of Advent (Gaudete)', season: 'Advent' },
    { date: addDays(advent1, 21), name: 'Fourth Sunday of Advent', season: 'Advent' },
    { date: new Date(year, 11, 8), name: 'Immaculate Conception of the Blessed Virgin Mary', season: 'Advent' },
    // ── Christmas season
    { date: new Date(year, 11, 24), name: 'Christmas Eve / Vigil of the Nativity', season: 'Christmas' },
    { date: new Date(year, 11, 25), name: 'The Nativity of the Lord (Christmas)', season: 'Christmas' },
    { date: new Date(year, 11, 26), name: 'St. Stephen, First Martyr', season: 'Christmas' },
    { date: new Date(year, 11, 27), name: 'St. John, Apostle and Evangelist', season: 'Christmas' },
    { date: new Date(year, 11, 28), name: 'Holy Innocents', season: 'Christmas' },
    { date: new Date(year, 0, 1), name: 'Solemnity of Mary, Mother of God', season: 'Christmas' },
    { date: new Date(year, 0, 6), name: 'Epiphany of the Lord (traditional)', season: 'Christmas' },
    // ── Lent
    { date: ashWednesday, name: 'Ash Wednesday', season: 'Lent' },
    { date: addDays(ashWednesday, 4), name: 'First Sunday of Lent', season: 'Lent' },
    { date: addDays(ashWednesday, 11), name: 'Second Sunday of Lent', season: 'Lent' },
    { date: addDays(ashWednesday, 18), name: 'Third Sunday of Lent', season: 'Lent' },
    { date: addDays(ashWednesday, 25), name: 'Fourth Sunday of Lent (Laetare)', season: 'Lent' },
    { date: addDays(ashWednesday, 32), name: 'Fifth Sunday of Lent', season: 'Lent' },
    { date: palmSunday, name: 'Palm Sunday of the Passion of the Lord', season: 'Lent' },
    { date: addDays(easter, -3), name: 'Holy Thursday — Evening Mass of the Lord\u2019s Supper', season: 'Lent' },
    { date: goodFriday, name: 'Good Friday of the Passion of the Lord', season: 'Lent' },
    { date: easterVigil, name: 'Easter Vigil in the Holy Night', season: 'Easter' },
    // ── Easter season
    { date: easter, name: 'Easter Sunday of the Resurrection of the Lord', season: 'Easter' },
    { date: addDays(easter, 7), name: 'Second Sunday of Easter (Divine Mercy)', season: 'Easter' },
    { date: addDays(easter, 14), name: 'Third Sunday of Easter', season: 'Easter' },
    { date: addDays(easter, 21), name: 'Fourth Sunday of Easter', season: 'Easter' },
    { date: addDays(easter, 28), name: 'Fifth Sunday of Easter', season: 'Easter' },
    { date: addDays(easter, 35), name: 'Sixth Sunday of Easter', season: 'Easter' },
    { date: ascension, name: 'Ascension of the Lord (Thursday)', season: 'Easter' },
    { date: addDays(easter, 42), name: 'Seventh Sunday of Easter / Ascension transferred (US)', season: 'Easter' },
    { date: pentecost, name: 'Pentecost Sunday', season: 'Easter' },
    // ── Solemnities after Pentecost (back in Ordinary Time)
    { date: trinity, name: 'Solemnity of the Most Holy Trinity', season: 'Ordinary Time' },
    { date: corpusChristi, name: 'Solemnity of the Body and Blood of Christ (Corpus Christi, US)', season: 'Ordinary Time' },
    { date: sacredHeart, name: 'Solemnity of the Most Sacred Heart of Jesus', season: 'Ordinary Time' },
    // ── Fixed solemnities + major feasts
    { date: new Date(year, 7, 15), name: 'Assumption of the Blessed Virgin Mary', season: 'Ordinary Time' },
    { date: new Date(year, 10, 1), name: 'All Saints', season: 'Ordinary Time' },
    { date: new Date(year, 10, 2), name: 'All Souls (Commemoration of All the Faithful Departed)', season: 'Ordinary Time' },
    { date: christTheKing, name: 'Solemnity of Our Lord Jesus Christ, King of the Universe (Christ the King)', season: 'Ordinary Time' },
  ];
}

// ── Liturgical season label for any date ─────────────────────────────

export function liturgicalSeasonOf(d: Date): LiturgicalSeason {
  const y = d.getFullYear();
  const advent1Prev = firstSundayOfAdvent(y - 1);
  const advent1 = firstSundayOfAdvent(y);
  const christmasEve = new Date(y, 11, 24);
  // Baptism of the Lord = Sunday after Jan 6 (rough US rule)
  const baptismOfTheLord = sundayOnOrAfter(new Date(y, 0, 7));
  const ashWednesday = addDays(easterDate(y), -46);
  const easterThisYear = easterDate(y);
  const pentecost = addDays(easterThisYear, 49);

  // Advent of the current year onward
  if (d >= advent1) return 'Advent';

  // Christmas season from Christmas Eve of the prior year through
  // Baptism of the Lord.
  const lastChristmas = new Date(y - 1, 11, 24);
  if (d >= lastChristmas && d <= baptismOfTheLord) return 'Christmas';
  // Or Christmas Eve of THIS year (we're before Advent? no — that's
  // covered above when d >= advent1). Safety fallthrough:
  if (d >= christmasEve) return 'Christmas';

  // Lent
  if (d >= ashWednesday && d < easterThisYear) return 'Lent';

  // Easter season
  if (d >= easterThisYear && d <= pentecost) return 'Easter';

  // Also handle Advent of prior year carrying into very early Jan
  if (d < baptismOfTheLord) return 'Christmas';

  return 'Ordinary Time';
}

// ── Single API the UI uses ───────────────────────────────────────────

export function liturgicalDayFor(d: Date): LiturgicalDay {
  const cycle = sundayCycle(d);
  const lyear = liturgicalYearOf(d);
  const season = liturgicalSeasonOf(d);

  // Look up named observation if any. We scan the feast list for both
  // the calendar year of `d` AND the prior year (covers the Dec-Jan
  // overlap where the liturgical year straddles civil years).
  const feasts = [...liturgicalFeasts(d.getFullYear()), ...liturgicalFeasts(d.getFullYear() - 1)];
  const match = feasts.find((f) => sameYMD(f.date, d));

  return {
    year: d.getFullYear(),
    liturgicalYear: lyear,
    cycle,
    season: match?.season ?? season,
    observation: match?.name ?? null,
  };
}

// ── USCCB lectionary URL (link-out) ──────────────────────────────────

/** Build the USCCB.org daily-readings URL for a date.
 * Pattern: bible.usccb.org/bible/readings/MMDDYY.cfm */
export function usccbReadingsUrl(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `https://bible.usccb.org/bible/readings/${mm}${dd}${yy}.cfm`;
}
