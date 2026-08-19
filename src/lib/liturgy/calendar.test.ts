import { describe, it, expect } from 'vitest';
import {
  computedDayTitle,
  easterDate,
  firstSundayOfAdvent,
  liturgicalAnchors,
  liturgicalDayFor,
  liturgicalSeasonOf,
  ordinaryTimeWeek,
} from './calendar';

// ── Independent fixtures ─────────────────────────────────────────────
//
// Nothing below derives an expected value by running the code under test.
// Easter comes from a published table; the Ordinary Time ordinals come
// from counting Sundays backward from Christ the King, which is fixed by
// Advent (and Advent by Christmas), never by Easter.

/** Easter Sundays, Gregorian. Includes the extremes the join has to
 * survive: Mar 22/23 (2008, 2285-early behaviour) and Apr 24/25 (2011,
 * 2038 — 25 April is the latest Easter can ever fall). */
const EASTER: Record<number, string> = {
  2000: '2000-04-23', 2001: '2001-04-15', 2002: '2002-03-31', 2003: '2003-04-20',
  2004: '2004-04-11', 2005: '2005-03-27', 2006: '2006-04-16', 2007: '2007-04-08',
  2008: '2008-03-23', 2009: '2009-04-12', 2010: '2010-04-04', 2011: '2011-04-24',
  2012: '2012-04-08', 2013: '2013-03-31', 2014: '2014-04-20', 2015: '2015-04-05',
  2016: '2016-03-27', 2017: '2017-04-16', 2018: '2018-04-01', 2019: '2019-04-21',
  2020: '2020-04-12', 2021: '2021-04-04', 2022: '2022-04-17', 2023: '2023-04-09',
  2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28',
  2028: '2028-04-16', 2029: '2029-04-01', 2030: '2030-04-21', 2031: '2031-04-13',
  2032: '2032-03-28', 2033: '2033-04-17', 2034: '2034-04-09', 2035: '2035-03-25',
  2038: '2038-04-25',
};

/** Years the property tests sweep. Deliberately mixes the earliest and
 * latest Easters in the table with a run of ordinary ones — the width of
 * Lent + Easter is exactly what stresses the Ordinary Time join. */
const STRESS_YEARS = [2008, 2011, 2035, 2038, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2032];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

/** Every calendar date in `year`, local midnight. */
function* daysOf(year: number): Generator<Date> {
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d = addDays(d, 1)) {
    yield d;
  }
}

// ── Easter, checked against the table not the algorithm ──────────────

describe('easterDate', () => {
  it('matches a published table of Easter Sundays, extremes included', () => {
    for (const [year, want] of Object.entries(EASTER)) {
      expect(iso(easterDate(Number(year)))).toBe(want);
    }
  });

  it('always lands on a Sunday, between 22 March and 25 April', () => {
    for (let y = 1900; y <= 2200; y++) {
      const e = easterDate(y);
      expect(e.getDay()).toBe(0);
      const early = new Date(y, 2, 22);
      const late = new Date(y, 3, 25);
      expect(e.getTime()).toBeGreaterThanOrEqual(early.getTime());
      expect(e.getTime()).toBeLessThanOrEqual(late.getTime());
    }
  });
});

// ── The anchor the product owner gave us ─────────────────────────────

describe('23 August 2026', () => {
  // Derived without touching Ordinary Time code: Christmas Day 2026 is a
  // Friday, so the First Sunday of Advent (the fourth Sunday before it) is
  // 29 Nov, Christ the King is 22 Nov, and 23 Aug is thirteen Sundays
  // earlier. 34 − 13 = 21.
  it('is the Twenty-First Sunday in Ordinary Time', () => {
    const d = new Date(2026, 7, 23);
    expect(d.getDay()).toBe(0);
    expect(liturgicalDayFor(d).observation).toBe('Twenty-First Sunday in Ordinary Time');
    expect(ordinaryTimeWeek(d)).toBe(21);
  });

  it('sits thirteen Sundays before Christ the King, which is 22 Nov 2026', () => {
    const advent1 = firstSundayOfAdvent(2026);
    expect(iso(advent1)).toBe('2026-11-29');
    const christTheKing = addDays(advent1, -7);
    expect(iso(christTheKing)).toBe('2026-11-22');
    const weeks = Math.round(
      (christTheKing.getTime() - new Date(2026, 7, 23).getTime()) / (7 * 86_400_000),
    );
    expect(weeks).toBe(13);
    expect(34 - weeks).toBe(21);
    expect(ordinaryTimeWeek(christTheKing)).toBe(34);
  });

  it('used to come back blank — the whole point of the change', () => {
    expect(liturgicalDayFor(new Date(2026, 7, 23)).observation).not.toBeNull();
    expect(liturgicalDayFor(new Date(2026, 7, 24)).observation)
      .toBe('Monday of the Twenty-First Week in Ordinary Time');
  });
});

// ── The hard part: the two blocks of Ordinary Time must join cleanly ──

describe('Ordinary Time week numbering', () => {
  it.each(STRESS_YEARS)(
    '%i: Sunday ordinals run strictly upward from 2 to 34',
    (year) => {
      const sundays: Array<{ date: string; week: number }> = [];
      for (const d of daysOf(year)) {
        if (d.getDay() !== 0) continue;
        const week = ordinaryTimeWeek(d);
        if (week === null) continue;
        sundays.push({ date: iso(d), week });
      }

      expect(sundays.length).toBeGreaterThan(20);
      expect(sundays[0].week).toBe(2);
      expect(sundays[sundays.length - 1].week).toBe(34);

      for (let i = 1; i < sundays.length; i++) {
        // A repeat (…, 8, 8, 9 …) or a step backwards is the classic
        // failure where the post-Pentecost block is numbered forward from
        // Pentecost instead of backward from Christ the King.
        expect(
          sundays[i].week,
          `${sundays[i].date} (week ${sundays[i].week}) does not advance on ` +
            `${sundays[i - 1].date} (week ${sundays[i - 1].week})`,
        ).toBeGreaterThan(sundays[i - 1].week);
      }
    },
  );

  it.each(STRESS_YEARS)(
    '%i: weekday week-numbers hold within a week and advance between weeks',
    (year) => {
      const days: Array<{ date: string; dow: number; week: number }> = [];
      for (const d of daysOf(year)) {
        const week = ordinaryTimeWeek(d);
        if (week === null) continue;
        days.push({ date: iso(d), dow: d.getDay(), week });
      }

      // The count opens on the day after the Baptism of the Lord, which is
      // week 1, and closes on the Saturday before Advent, which is 34.
      // Usually that first day is a Monday — but in the years Epiphany is
      // kept on Jan 7 or 8 the Baptism is itself a Monday and Ordinary Time
      // opens on the Tuesday, so this reads the anchor rather than the
      // weekday.
      const a = liturgicalAnchors(year);
      expect(days[0].date).toBe(iso(addDays(a.baptismOfTheLord, 1)));
      expect(days[0].week).toBe(1);
      expect(days[days.length - 1].dow).toBe(6);
      expect(days[days.length - 1].week).toBe(34);

      for (const day of days) {
        expect(day.week).toBeGreaterThanOrEqual(1);
        expect(day.week).toBeLessThanOrEqual(34);
      }

      // Every day of one liturgical week carries that week's number, and
      // the numbers never revisit a week once they have left it.
      const seen: number[] = [];
      for (const day of days) {
        if (seen[seen.length - 1] !== day.week) seen.push(day.week);
      }
      for (let i = 1; i < seen.length; i++) {
        expect(seen[i], `week ${seen[i]} follows week ${seen[i - 1]} in ${year}`)
          .toBeGreaterThan(seen[i - 1]);
      }
      expect(new Set(seen).size).toBe(seen.length);
    },
  );

  it('numbers the join of 2026 as 1–6 then 8–34, omitting week 7', () => {
    // A skipped week is correct and expected: the count is fixed at both
    // ends, so the surplus has to go somewhere. A REPEATED week is not.
    const weeks = new Set<number>();
    for (const d of daysOf(2026)) {
      const w = ordinaryTimeWeek(d);
      if (w !== null) weeks.add(w);
    }
    expect([...weeks].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
    ]);
  });

  it('never repeats or skips more than one week at the join, 1990–2100', () => {
    for (let year = 1990; year <= 2100; year++) {
      const a = liturgicalAnchors(year);
      const lastOfBlock1 = ordinaryTimeWeek(addDays(a.ashWednesday, -1));
      const firstOfBlock2 = ordinaryTimeWeek(addDays(a.pentecost, 1));
      expect(lastOfBlock1, `${year} block 1`).not.toBeNull();
      expect(firstOfBlock2, `${year} block 2`).not.toBeNull();
      const gap = firstOfBlock2! - lastOfBlock1!;
      expect(gap, `${year}: block 1 ends at ${lastOfBlock1}, block 2 opens at ${firstOfBlock2}`)
        .toBeGreaterThanOrEqual(1);
      expect(gap, `${year}: more than one week omitted at the join`).toBeLessThanOrEqual(2);
    }
  });

  it('holds the 2 → 34 Sunday invariant for every year 1990–2100', () => {
    // The twelve stress years above are the readable cases; this is the
    // sweep. Kept separate so a failure names the year rather than the
    // whole range.
    for (let year = 1990; year <= 2100; year++) {
      const weeks: number[] = [];
      for (const d of daysOf(year)) {
        if (d.getDay() !== 0) continue;
        const week = ordinaryTimeWeek(d);
        if (week !== null) weeks.push(week);
      }
      expect(weeks[0], `${year} first OT Sunday`).toBe(2);
      expect(weeks[weeks.length - 1], `${year} last OT Sunday`).toBe(34);
      for (let i = 1; i < weeks.length; i++) {
        expect(weeks[i], `${year}: ${weeks[i]} follows ${weeks[i - 1]}`)
          .toBeGreaterThan(weeks[i - 1]);
      }
    }
  });

  it('returns null outside Ordinary Time', () => {
    expect(ordinaryTimeWeek(new Date(2026, 3, 5))).toBeNull();  // Easter Sunday
    expect(ordinaryTimeWeek(new Date(2026, 1, 18))).toBeNull(); // Ash Wednesday
    expect(ordinaryTimeWeek(new Date(2026, 11, 6))).toBeNull(); // Advent
    expect(ordinaryTimeWeek(new Date(2026, 11, 29))).toBeNull(); // Christmas season
  });
});

// ── Every date gets a title ──────────────────────────────────────────

describe('computedDayTitle', () => {
  it('produces a plausible title for every date from 1990 to 2060', () => {
    for (let year = 1990; year <= 2060; year++) {
      for (const d of daysOf(year)) {
        const title = computedDayTitle(d);
        expect(title, iso(d)).toBeTruthy();
        expect(title, iso(d)).not.toMatch(/undefined|NaN|null|\bof the\s+(Week|Sunday)/);
        expect(title, iso(d)).toMatch(/^[A-Z]/);
      }
    }
  });

  it('never leaves observation null, feast day or not, 2024–2032', () => {
    for (let year = 2024; year <= 2032; year++) {
      for (const d of daysOf(year)) {
        const day = liturgicalDayFor(d);
        expect(day.observation, iso(d)).toBeTruthy();
        expect(typeof day.observation).toBe('string');
      }
    }
  });

  it('names the weekdays of Ordinary Time', () => {
    // Week of the Twenty-First Sunday, 2026.
    expect(computedDayTitle(new Date(2026, 7, 24)))
      .toBe('Monday of the Twenty-First Week in Ordinary Time');
    expect(computedDayTitle(new Date(2026, 7, 29)))
      .toBe('Saturday of the Twenty-First Week in Ordinary Time');
    // Next Sunday moves the count on by one.
    expect(computedDayTitle(new Date(2026, 7, 30)))
      .toBe('Twenty-Second Sunday in Ordinary Time');
  });

  it('spells ordinals as words, matching the feast names', () => {
    const titles = [...daysOf(2026)].map(computedDayTitle);
    expect(titles).toContain('Twenty-First Sunday in Ordinary Time');
    expect(titles).toContain('Thirty-Fourth Sunday in Ordinary Time');
    expect(titles.some((t) => /\b\d/.test(t) && !t.startsWith('Christmas Weekday'))).toBe(false);
  });

  it('names Advent weekdays by their week', () => {
    const advent1 = firstSundayOfAdvent(2026);
    expect(iso(advent1)).toBe('2026-11-29');
    expect(computedDayTitle(addDays(advent1, 1))).toBe('Monday of the First Week of Advent');
    expect(computedDayTitle(addDays(advent1, 9))).toBe('Tuesday of the Second Week of Advent');
    expect(computedDayTitle(addDays(advent1, 17))).toBe('Wednesday of the Third Week of Advent');
  });

  it('names the days after Ash Wednesday, then Lenten weeks, then Holy Week', () => {
    const a = liturgicalAnchors(2026);
    expect(iso(a.ashWednesday)).toBe('2026-02-18');
    expect(computedDayTitle(addDays(a.ashWednesday, 1))).toBe('Thursday after Ash Wednesday');
    expect(computedDayTitle(addDays(a.ashWednesday, 3))).toBe('Saturday after Ash Wednesday');
    // Ash Wednesday + 4 is the First Sunday of Lent, so + 5 opens week 1.
    expect(computedDayTitle(addDays(a.ashWednesday, 5))).toBe('Monday of the First Week of Lent');
    expect(computedDayTitle(addDays(a.ashWednesday, 13))).toBe('Tuesday of the Second Week of Lent');
    // The week that opens with Palm Sunday is Holy Week, not "the Sixth
    // Week of Lent".
    expect(computedDayTitle(addDays(a.easter, -6))).toBe('Monday of Holy Week');
    expect(computedDayTitle(addDays(a.easter, -4))).toBe('Wednesday of Holy Week');
  });

  it('names the Easter octave for Easter, and later weeks by number', () => {
    const easter = easterDate(2026);
    expect(computedDayTitle(addDays(easter, 1))).toBe('Monday within the Octave of Easter');
    expect(computedDayTitle(addDays(easter, 6))).toBe('Saturday within the Octave of Easter');
    // Easter + 7 is the Second Sunday, so + 9 is the Tuesday of week 2.
    expect(computedDayTitle(addDays(easter, 9))).toBe('Tuesday of the Second Week of Easter');
    expect(computedDayTitle(addDays(easter, 16))).toBe('Tuesday of the Third Week of Easter');
    // The week between Ascension and Pentecost.
    expect(computedDayTitle(addDays(easter, 47))).toBe('Friday of the Seventh Week of Easter');
  });

  it('names the Christmas season by the octave, then Epiphany, then Baptism', () => {
    expect(computedDayTitle(new Date(2026, 11, 29)))
      .toBe('Fifth Day within the Octave of the Nativity of the Lord');
    expect(computedDayTitle(new Date(2026, 11, 31)))
      .toBe('Seventh Day within the Octave of the Nativity of the Lord');
    // 27 Dec 2026 is the Sunday in the octave.
    expect(new Date(2026, 11, 27).getDay()).toBe(0);
    expect(computedDayTitle(new Date(2026, 11, 27)))
      .toBe('The Holy Family of Jesus, Mary and Joseph');
    // Epiphany 2027 is transferred to Sunday 3 Jan, so 4 Jan is the day
    // AFTER Epiphany — it used to read "Christmas Weekday (January 4)"
    // because the comparison was against a fixed 6 January.
    expect(computedDayTitle(new Date(2027, 0, 3))).toBe('The Epiphany of the Lord');
    expect(computedDayTitle(new Date(2027, 0, 4))).toBe('Monday after Epiphany');
    expect(computedDayTitle(new Date(2027, 0, 7))).toBe('Thursday after Epiphany');
    expect(computedDayTitle(new Date(2027, 0, 10))).toBe('The Baptism of the Lord');
    expect(liturgicalSeasonOf(new Date(2027, 0, 10))).toBe('Christmas');
    expect(liturgicalSeasonOf(new Date(2027, 0, 11))).toBe('Ordinary Time');
    // Epiphany 2026 is Sunday 4 Jan, so 2–3 Jan really are plain weekdays.
    expect(computedDayTitle(new Date(2026, 0, 2))).toBe('Christmas Weekday (January 2)');
    expect(computedDayTitle(new Date(2026, 0, 4))).toBe('The Epiphany of the Lord');
  });

  it('reads the same whatever time of day the Date carries', () => {
    const midnight = new Date(2026, 7, 23);
    const evening = new Date(2026, 7, 23, 23, 59, 59);
    expect(computedDayTitle(evening)).toBe(computedDayTitle(midnight));
    // The Baptism of the Lord is the boundary a stray wall-clock time used
    // to fall off: the season flipped to Ordinary Time after midnight.
    const baptism = liturgicalAnchors(2026).baptismOfTheLord;
    const baptismAfternoon = new Date(
      baptism.getFullYear(), baptism.getMonth(), baptism.getDate(), 15, 30,
    );
    expect(liturgicalSeasonOf(baptismAfternoon)).toBe('Christmas');
    expect(computedDayTitle(baptismAfternoon)).toBe('The Baptism of the Lord');
  });
});

// ── A named feast still wins ─────────────────────────────────────────

describe('liturgicalDayFor', () => {
  it('prefers a named solemnity over the computed title', () => {
    expect(liturgicalDayFor(new Date(2026, 3, 5)).observation)
      .toBe('Easter Sunday of the Resurrection of the Lord');
    expect(liturgicalDayFor(new Date(2026, 10, 22)).observation)
      .toBe('Solemnity of Our Lord Jesus Christ, King of the Universe (Christ the King)');
    expect(liturgicalDayFor(new Date(2026, 7, 15)).observation)
      .toBe('Assumption of the Blessed Virgin Mary');
    expect(liturgicalDayFor(new Date(2026, 4, 24)).observation).toBe('Pentecost Sunday');
    expect(liturgicalDayFor(new Date(2026, 1, 18)).observation).toBe('Ash Wednesday');
    expect(liturgicalDayFor(new Date(2026, 10, 29)).observation).toBe('First Sunday of Advent');
    // …but the day after a solemnity falls back to the computed title.
    expect(liturgicalDayFor(new Date(2026, 10, 23)).observation)
      .toBe('Monday of the Thirty-Fourth Week in Ordinary Time');
  });

  it('gives the Holy Family the Sunday, over the octave saints', () => {
    // A Feast of the Lord outranks a feast of a saint, and the Holy Family
    // is the Sunday in the Christmas octave — so in about half of all years
    // it lands on 26, 27 or 28 December, where the feast table (a flat list
    // with no rank) carries St. Stephen, St. John and the Holy Innocents.
    // These assertions run through liturgicalDayFor, the function the UI
    // actually calls; computedDayTitle got this right all along while the
    // shipped path did not.
    for (const [y, m, day] of [[2026, 11, 27], [2027, 11, 26], [2025, 11, 28]] as const) {
      const d = new Date(y, m, day);
      expect(d.getDay(), `${iso(d)} must be a Sunday for this case to bite`).toBe(0);
      expect(liturgicalDayFor(d).observation, iso(d))
        .toBe('The Holy Family of Jesus, Mary and Joseph');
    }
    // The saints keep their days in every year the Sunday falls elsewhere.
    expect(liturgicalDayFor(new Date(2026, 11, 26)).observation)
      .toBe('St. Stephen, First Martyr');
    expect(liturgicalDayFor(new Date(2026, 11, 28)).observation).toBe('Holy Innocents');
    // Christmas Day and the Solemnity of Mary are never displaced.
    expect(liturgicalDayFor(new Date(2026, 11, 25)).observation)
      .toBe('The Nativity of the Lord (Christmas)');
    expect(liturgicalDayFor(new Date(2027, 0, 1)).observation)
      .toBe('Solemnity of Mary, Mother of God');
  });

  it('does not let a computed title rename a feast the table already names', () => {
    // The override set is keyed on the COMPUTED title, so widening it is how
    // a feast name would get quietly rewritten — which the brief forbids.
    // 6 Jan 2030 is a Sunday, so the transferred Epiphany and the table's
    // traditional entry land on the same date and the table must still win.
    expect(new Date(2030, 0, 6).getDay()).toBe(0);
    expect(iso(liturgicalAnchors(2030).epiphany)).toBe('2030-01-06');
    expect(computedDayTitle(new Date(2030, 0, 6))).toBe('The Epiphany of the Lord');
    expect(liturgicalDayFor(new Date(2030, 0, 6)).observation)
      .toBe('Epiphany of the Lord (traditional)');
  });

  it('exists exactly once a year, 2020–2060, Holy Family included', () => {
    for (let year = 2020; year <= 2060; year++) {
      const titles = [...daysOf(year)].map((d) => liturgicalDayFor(d).observation);
      const count = (name: string) => titles.filter((t) => t === name).length;
      expect(count('The Holy Family of Jesus, Mary and Joseph'), `${year} Holy Family`).toBe(1);
      expect(count('The Baptism of the Lord'), `${year} Baptism`).toBe(1);
    }
  });

  it('never lets Epiphany vanish behind the Baptism of the Lord', () => {
    // sundayOnOrAfter(Jan 7) returned the Epiphany Sunday itself whenever it
    // fell on 7 or 8 January — the day was labelled the Baptism, Epiphany
    // never appeared, and Ordinary Time opened a day early. 2024, 2029,
    // 2034, 2035, 2040, 2045, 2046, 2051, 2052 and 2057 are the years.
    for (let year = 2020; year <= 2060; year++) {
      const a = liturgicalAnchors(year);
      expect(a.epiphany.getDay(), `${year} Epiphany is a Sunday`).toBe(0);
      expect(a.epiphany.getDate(), `${year} Epiphany is 2–8 Jan`).toBeGreaterThanOrEqual(2);
      expect(a.epiphany.getDate(), `${year} Epiphany is 2–8 Jan`).toBeLessThanOrEqual(8);
      expect(iso(a.baptismOfTheLord), `${year} Baptism is a different day`)
        .not.toBe(iso(a.epiphany));
      expect(a.baptismOfTheLord.getTime()).toBeGreaterThan(a.epiphany.getTime());
      expect(computedDayTitle(a.epiphany), `${year} Epiphany`)
        .toBe('The Epiphany of the Lord');
      expect(computedDayTitle(a.baptismOfTheLord), `${year} Baptism`)
        .toBe('The Baptism of the Lord');
      // Both are inside the Christmas season; Ordinary Time opens after.
      expect(liturgicalSeasonOf(a.baptismOfTheLord), `${year}`).toBe('Christmas');
      expect(liturgicalSeasonOf(addDays(a.baptismOfTheLord, 1)), `${year}`)
        .toBe('Ordinary Time');
    }
  });

  it('moves the Baptism to the Monday when Epiphany takes the Sunday of 7/8 Jan', () => {
    // 2024: Epiphany Sunday 7 Jan, Baptism Monday 8 Jan, Ordinary Time from
    // Tuesday 9 Jan. Confirmed independently: 1 Jan 2024 was a Monday.
    expect(new Date(2024, 0, 1).getDay()).toBe(1);
    const a = liturgicalAnchors(2024);
    expect(iso(a.epiphany)).toBe('2024-01-07');
    expect(iso(a.baptismOfTheLord)).toBe('2024-01-08');
    expect(a.baptismOfTheLord.getDay()).toBe(1);
    expect(computedDayTitle(new Date(2024, 0, 9)))
      .toBe('Tuesday of the First Week in Ordinary Time');
    // 14 Jan 2024 was the Second Sunday in Ordinary Time.
    expect(liturgicalDayFor(new Date(2024, 0, 14)).observation)
      .toBe('Second Sunday in Ordinary Time');
  });

  it('names the greatest days, which computedDayTitle alone gets wrong', () => {
    // computedDayTitle knows seasons, not solemnities, so on these days it
    // returns the ferial POSITION. liturgicalDayFor is what the UI calls and
    // is what has to be right. This pins the delegation contract.
    const easter = easterDate(2026);
    const cases: Array<[Date, string, string]> = [
      [easter, 'First Sunday of Easter', 'Easter Sunday of the Resurrection of the Lord'],
      [addDays(easter, -7), 'Sunday of Holy Week', 'Palm Sunday of the Passion of the Lord'],
      [addDays(easter, -2), 'Friday of Holy Week', 'Good Friday of the Passion of the Lord'],
      [addDays(easter, 49), 'Eighth Sunday of Easter', 'Pentecost Sunday'],
    ];
    for (const [d, ferial, name] of cases) {
      expect(computedDayTitle(d), `computedDayTitle ${iso(d)}`).toBe(ferial);
      expect(liturgicalDayFor(d).observation, `liturgicalDayFor ${iso(d)}`).toBe(name);
    }
  });

  it('keeps cycle and season alongside the title', () => {
    const day = liturgicalDayFor(new Date(2026, 7, 23));
    // Liturgical year 2026 opened on the First Sunday of Advent 2025 and is
    // Year A (2024–25 was Year C — the ending civil year divides by 3).
    expect(day.cycle).toBe('A');
    expect(day.season).toBe('Ordinary Time');
    expect(day.liturgicalYear).toBe(2026);
  });
});

// ── The season boundary the titles depend on ─────────────────────────

describe('liturgicalSeasonOf', () => {
  it('ends Advent at Christmas Eve rather than at New Year', () => {
    // 29–31 Dec are after the First Sunday of Advent on the civil calendar
    // but are Christmas days. Reporting Advent here produced a nonexistent
    // "Fifth Week of Advent".
    expect(liturgicalSeasonOf(new Date(2026, 11, 23))).toBe('Advent');
    expect(liturgicalSeasonOf(new Date(2026, 11, 24))).toBe('Christmas');
    expect(liturgicalSeasonOf(new Date(2026, 11, 29))).toBe('Christmas');
    expect(liturgicalSeasonOf(new Date(2026, 11, 31))).toBe('Christmas');
    expect(liturgicalSeasonOf(new Date(2027, 0, 2))).toBe('Christmas');
  });

  it('agrees with the anchors it is built from, every day of 1990–2060', () => {
    for (let year = 1990; year <= 2060; year++) {
      const a = liturgicalAnchors(year);
      for (const d of daysOf(year)) {
        const season = liturgicalSeasonOf(d);
        if (season === 'Ordinary Time') {
          const inBlock1 = d > a.baptismOfTheLord && d < a.ashWednesday;
          const inBlock2 = d > a.pentecost && d < a.advent1;
          expect(inBlock1 || inBlock2, `${iso(d)} claims Ordinary Time`).toBe(true);
        }
        if (season === 'Lent') {
          expect(d >= a.ashWednesday && d < a.easter, iso(d)).toBe(true);
        }
        if (season === 'Easter') {
          expect(d >= a.easter && d <= a.pentecost, iso(d)).toBe(true);
        }
        if (season === 'Advent') {
          expect(d >= a.advent1 && d < a.christmasEve, iso(d)).toBe(true);
        }
      }
    }
  });
});
