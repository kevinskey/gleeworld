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
//   - A title for EVERY date, feast or not (see `computedDayTitle`)
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
  /** The day's title. Never null: a named solemnity/feast if the date has
   * one, otherwise the title computed from the season and the week within
   * it ("Twenty-First Sunday in Ordinary Time", "Monday of the First Week
   * of Lent"). See `computedDayTitle`. */
  observation: string;
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

/** Local midnight of `d`. Every comparison below is a whole-day comparison,
 * so a Date carrying a wall-clock time (`new Date()`) must be flattened
 * first or "is today the Baptism of the Lord?" is false all afternoon. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole weeks from `from` to `to`, both local midnights on a Sunday.
 * Rounded, not floored: a week that spans a DST change is 7×24h ± 1h. */
function weeksBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000));
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

// ── Season anchors ───────────────────────────────────────────────────

/** The handful of dates every season boundary AND every computed day title
 * is derived from, for one civil year. Both live off this one object so a
 * date can never land in a season whose title generator disagrees with it. */
export interface LiturgicalAnchors {
  /** First Sunday of Advent — opens the liturgical year, late Nov / early Dec. */
  advent1: Date;
  /** Sunday before `advent1`: the Thirty-Fourth (last) Sunday in Ordinary Time. */
  christTheKing: Date;
  /** Dec 24. The Christmas season runs from here into the NEXT civil year. */
  christmasEve: Date;
  /** Epiphany as this province keeps it: the Sunday falling between Jan 2
   * and Jan 8. (The feast table also carries the traditional Jan 6.) */
  epiphany: Date;
  /** The Sunday after Epiphany — or the MONDAY after it when Epiphany is
   * itself kept on Jan 7 or Jan 8. Closes the Christmas season. */
  baptismOfTheLord: Date;
  /** Easter − 46 days. Opens Lent, closes the first block of Ordinary Time. */
  ashWednesday: Date;
  /** First Sunday of Lent = Ash Wednesday + 4 (always a Sunday). */
  firstSundayOfLent: Date;
  easter: Date;
  /** Easter + 49. Closes the Easter season; Ordinary Time resumes the next day. */
  pentecost: Date;
}

export function liturgicalAnchors(year: number): LiturgicalAnchors {
  const advent1 = firstSundayOfAdvent(year);
  const easter = easterDate(year);
  const ashWednesday = addDays(easter, -46);
  // Epiphany is transferred to the Sunday between Jan 2 and Jan 8 — exactly
  // one Sunday falls in that seven-day span. The Baptism of the Lord is the
  // Sunday after it, EXCEPT when Epiphany itself is kept on Jan 7 or Jan 8,
  // when the Baptism moves to the Monday immediately following.
  //
  // The old rule here was `sundayOnOrAfter(Jan 7)`, which in the ~27% of
  // years where the Epiphany Sunday is Jan 7 or Jan 8 returned that SAME
  // Sunday: the day was labelled the Baptism, Epiphany vanished from the
  // calendar entirely, and Ordinary Time opened a day early.
  const epiphany = sundayOnOrAfter(new Date(year, 0, 2));
  const baptismOfTheLord = epiphany.getDate() >= 7
    ? addDays(epiphany, 1)
    : addDays(epiphany, 7);
  return {
    advent1,
    christTheKing: addDays(advent1, -7),
    christmasEve: new Date(year, 11, 24),
    epiphany,
    baptismOfTheLord,
    ashWednesday,
    firstSundayOfLent: addDays(ashWednesday, 4),
    easter,
    pentecost: addDays(easter, 49),
  };
}

// ── Liturgical season label for any date ─────────────────────────────

export function liturgicalSeasonOf(input: Date): LiturgicalSeason {
  const d = startOfDay(input);
  const a = liturgicalAnchors(d.getFullYear());

  // Christmas Eve onward. This is checked BEFORE Advent because Dec 24–31
  // are also >= the First Sunday of Advent: Advent ends when Christmas
  // begins, not at New Year. (Before this ordering, Dec 29–31 reported
  // 'Advent' and would have produced a "Fifth Week of Advent" title.)
  if (d >= a.christmasEve) return 'Christmas';
  if (d >= a.advent1) return 'Advent';

  // The PREVIOUS year's Christmas season, still running in January. Any
  // date on or before the Baptism of the Lord is inside it — Ash Wednesday
  // is Feb 4 at the very earliest, so nothing else can reach back here.
  if (d <= a.baptismOfTheLord) return 'Christmas';

  if (d >= a.ashWednesday && d < a.easter) return 'Lent';
  if (d >= a.easter && d <= a.pentecost) return 'Easter';

  // What's left is exactly the two blocks of Ordinary Time:
  //   (Baptism of the Lord, Ash Wednesday) and (Pentecost, Advent I).
  return 'Ordinary Time';
}

// ── Week-of-season arithmetic ────────────────────────────────────────

/** Week of Ordinary Time for `d`, or null if `d` is in another season.
 *
 * Ordinary Time is one 34-week count served in two blocks, split by Lent
 * and Easter, and the two are numbered from OPPOSITE ends:
 *
 *   Block 1 counts FORWARD from the Baptism of the Lord. Baptism is the
 *   Sunday of week 1 (it stands in for a "First Sunday in Ordinary Time",
 *   which therefore never occurs), so the Monday after it opens week 1 and
 *   the next Sunday is the Second Sunday in Ordinary Time.
 *
 *   Block 2 counts BACKWARD from the end, because the last week must be
 *   week 34 — Christ the King is the Thirty-Fourth Sunday, by definition
 *   the Sunday before Advent. Counting forward from Pentecost instead
 *   would land wherever Easter happened to fall that year and leave the
 *   final week at 32, 33 or 35.
 *
 * Because Easter moves over a month, the join between the blocks normally
 * OMITS one week number (in 2026, block 1 ends at 6 and block 2 opens at
 * 8 — week 7 is never celebrated). That is the correct behaviour, not a
 * bug: the count is still strictly increasing and still ends at 34. What
 * must never happen is a repeated or decreasing number.
 */
export function ordinaryTimeWeek(input: Date): number | null {
  const d = startOfDay(input);
  if (liturgicalSeasonOf(d) !== 'Ordinary Time') return null;
  return ordinaryTimeWeekUnchecked(d, liturgicalAnchors(d.getFullYear()));
}

/** The arithmetic alone, for callers that have already established that `d`
 * is in Ordinary Time. Ordinary Time never straddles New Year, so both
 * blocks read their anchors from this date's own civil year. */
function ordinaryTimeWeekUnchecked(d: Date, a: LiturgicalAnchors): number {
  const sunday = sundayOnOrBefore(d);
  // Both ends of the subtraction have to be Sundays for the week count to
  // come out whole. The Baptism is usually a Sunday but is a Monday in the
  // years Epiphany is kept on Jan 7 or 8, so anchor on its own Sunday.
  const week1Sunday = sundayOnOrBefore(a.baptismOfTheLord);
  return d < a.ashWednesday
    ? 1 + weeksBetween(week1Sunday, sunday)
    : 34 - weeksBetween(sunday, a.christTheKing);
}

// ── Computed day titles ──────────────────────────────────────────────

/** Ordinals as words, to match the style of the feast names above
 * ("First Sunday of Advent", "Fourth Sunday of Lent"). Index 1..34 —
 * 34 is Christ the King, the highest week any season reaches. */
const ORDINAL_WORDS = [
  '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh',
  'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth',
  'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth',
  'Nineteenth', 'Twentieth', 'Twenty-First', 'Twenty-Second',
  'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth',
  'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth',
  'Thirty-First', 'Thirty-Second', 'Thirty-Third', 'Thirty-Fourth',
] as const;

function ordinalWord(n: number): string {
  return ORDINAL_WORDS[n] ?? String(n);
}

/** Fixed, not `toLocaleDateString` — the title is liturgical English on
 * every device, and must not follow the browser's locale. */
const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
] as const;

/** Holy Family = the Sunday inside the Christmas octave (Dec 26–31). When
 * Christmas itself is a Sunday there is no such Sunday, and it is kept on
 * Dec 30. */
function holyFamilyDate(year: number): Date {
  const sunday = sundayOnOrAfter(new Date(year, 11, 26));
  return sunday.getMonth() === 11 ? sunday : new Date(year, 11, 30);
}

function adventTitle(d: Date, a: LiturgicalAnchors): string {
  const week = 1 + weeksBetween(a.advent1, sundayOnOrBefore(d));
  return d.getDay() === 0
    ? `${ordinalWord(week)} Sunday of Advent`
    : `${WEEKDAY_NAMES[d.getDay()]} of the ${ordinalWord(week)} Week of Advent`;
}

function christmasTitle(d: Date): string {
  const day = d.getDate();

  // December side of the season: the octave of the Nativity.
  if (d.getMonth() === 11) {
    if (day === 24) return 'Christmas Eve';
    if (sameYMD(d, holyFamilyDate(d.getFullYear()))) {
      return 'The Holy Family of Jesus, Mary and Joseph';
    }
    // Dec 25 is the First Day, Dec 31 the Seventh. (The Eighth is Jan 1,
    // the Solemnity of Mary, which the feast table already names.)
    return `${ordinalWord(day - 24)} Day within the Octave of the Nativity of the Lord`;
  }

  // January side: Solemnity of Mary → Epiphany → Baptism of the Lord.
  const a = liturgicalAnchors(d.getFullYear());
  if (sameYMD(d, a.baptismOfTheLord)) return 'The Baptism of the Lord';
  if (day === 1) return 'Solemnity of Mary, Mother of God';
  // Epiphany is the anchor's — the transferred Sunday, not a fixed Jan 6.
  // Comparing against Jan 6 read the days between a transferred Epiphany
  // and Jan 6 as ordinary Christmas weekdays rather than "…after Epiphany".
  if (sameYMD(d, a.epiphany)) return 'The Epiphany of the Lord';
  if (d > a.epiphany) return `${WEEKDAY_NAMES[d.getDay()]} after Epiphany`;
  return `Christmas Weekday (${MONTH_NAMES[d.getMonth()]} ${day})`;
}

function lentTitle(d: Date, a: LiturgicalAnchors): string {
  // Ash Wednesday and the three days after it sit outside the numbered
  // weeks — Lent's week 1 opens with the First Sunday.
  if (d < a.firstSundayOfLent) return `${WEEKDAY_NAMES[d.getDay()]} after Ash Wednesday`;
  const week = 1 + weeksBetween(a.firstSundayOfLent, sundayOnOrBefore(d));
  // Week 6 opens with Palm Sunday and is called Holy Week, never "the
  // Sixth Week of Lent".
  if (week >= 6) return `${WEEKDAY_NAMES[d.getDay()]} of Holy Week`;
  return d.getDay() === 0
    ? `${ordinalWord(week)} Sunday of Lent`
    : `${WEEKDAY_NAMES[d.getDay()]} of the ${ordinalWord(week)} Week of Lent`;
}

function easterTitle(d: Date, a: LiturgicalAnchors): string {
  // The octave: the eight days from Easter are each celebrated as Easter
  // itself, and are named for it rather than for a week.
  if (d > a.easter && d < addDays(a.easter, 7)) {
    return `${WEEKDAY_NAMES[d.getDay()]} within the Octave of Easter`;
  }
  const week = 1 + weeksBetween(a.easter, sundayOnOrBefore(d));
  return d.getDay() === 0
    ? `${ordinalWord(week)} Sunday of Easter`
    : `${WEEKDAY_NAMES[d.getDay()]} of the ${ordinalWord(week)} Week of Easter`;
}

function ordinaryTimeTitle(d: Date, a: LiturgicalAnchors): string {
  const week = ordinaryTimeWeekUnchecked(d, a);
  return d.getDay() === 0
    ? `${ordinalWord(week)} Sunday in Ordinary Time`
    : `${WEEKDAY_NAMES[d.getDay()]} of the ${ordinalWord(week)} Week in Ordinary Time`;
}

/**
 * The title a date carries by virtue of WHERE IT SITS in the year, with no
 * reference to the feast table. Total: every date gets a string.
 *
 * **Not a display title on its own — always go through `liturgicalDayFor`.**
 * This function knows seasons and week numbers, not solemnities, so on the
 * greatest days of the year it returns the day's ferial POSITION rather
 * than its name: Easter Sunday reads "First Sunday of Easter", Palm Sunday
 * "Sunday of Holy Week", Pentecost "Eighth Sunday of Easter", Good Friday
 * "Friday of Holy Week". `liturgicalDayFor` overlays the feast table, which
 * is where those names live, and is the only function the UI should call.
 *
 * What this is for is the ~300 days a year that have no entry in the feast
 * table — the ordinary Sundays and weekdays the Observation field used to
 * leave blank.
 */
export function computedDayTitle(input: Date): string {
  const d = startOfDay(input);
  const season = liturgicalSeasonOf(d);
  // The Christmas season straddles New Year, so its anchors may belong to
  // either civil year; `christmasTitle` picks the right ones itself.
  const a = liturgicalAnchors(d.getFullYear());
  switch (season) {
    case 'Advent': return adventTitle(d, a);
    case 'Christmas': return christmasTitle(d);
    case 'Lent': return lentTitle(d, a);
    case 'Easter': return easterTitle(d, a);
    case 'Ordinary Time': return ordinaryTimeTitle(d, a);
  }
}

// ── Single API the UI uses ───────────────────────────────────────────

/** Computed titles that outrank a same-day entry in the feast table.
 *
 * A Feast of the LORD takes precedence over a feast of a saint. The Holy
 * Family is the Sunday inside the Christmas octave, so it lands on Dec 26,
 * 27 or 28 in roughly half of all years — and those three dates carry
 * St. Stephen, St. John and the Holy Innocents in the table, which is a
 * flat list with no rank. Without this the parish saw a saint's day on the
 * Sunday: 27 Dec 2026, 26 Dec 2027 and 28 Dec 2025 all read wrong.
 *
 * Deliberately just the one entry. The other two moveable feasts of the
 * Lord in this season collide with nothing — the Baptism has no table
 * entry at all, and Epiphany's only entry is on its traditional Jan 6,
 * whose NAME must not be rewritten from here. */
const COMPUTED_FEASTS_OF_THE_LORD = new Set([
  'The Holy Family of Jesus, Mary and Joseph',
]);

export function liturgicalDayFor(input: Date): LiturgicalDay {
  const d = startOfDay(input);
  const cycle = sundayCycle(d);
  const lyear = liturgicalYearOf(d);
  const season = liturgicalSeasonOf(d);

  // Look up named observation if any. We scan the feast list for both
  // the calendar year of `d` AND the prior year (covers the Dec-Jan
  // overlap where the liturgical year straddles civil years).
  const feasts = [...liturgicalFeasts(d.getFullYear()), ...liturgicalFeasts(d.getFullYear() - 1)];
  const match = feasts.find((f) => sameYMD(f.date, d));

  // A named feast wins — it is why the solemnities read the way a parish
  // expects, and the computed title fills the days without one. The single
  // exception is a computed Feast of the Lord landing on a fixed saint's
  // day, which outranks it (see COMPUTED_FEASTS_OF_THE_LORD).
  const computed = computedDayTitle(d);
  const computedOutranks = COMPUTED_FEASTS_OF_THE_LORD.has(computed);

  return {
    year: d.getFullYear(),
    liturgicalYear: lyear,
    cycle,
    season: match?.season ?? season,
    observation: match && !computedOutranks ? match.name : computed,
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
