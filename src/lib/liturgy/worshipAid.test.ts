import { describe, it, expect } from 'vitest';
import {
  buildWorshipAid, splitCredit, formatLongDate, SHEETS, DEFAULT_SETTINGS,
  panelSpacing, SPACING_MIN, SPACING_MAX,
  coverTitleSize, coverImageScale, COVER_TITLE_MIN, COVER_TITLE_MAX,
  COVER_IMAGE_MIN, COVER_IMAGE_MAX, COVER_TITLE_DEFAULT, COVER_IMAGE_DEFAULT,
  type AidSource, type WorshipAidSettings,
} from './worshipAid';
import { PSALM_WIDTH_IN } from './psalmComposer';

const source: AidSource = {
  mass_date: '2013-12-22',
  observation: 'Fourth Sunday of Advent',
  liturgical_season: 'Advent',
  setting_title: 'The Order of Mass — LMGM Hymnal #402 ff',
  prelude_title: 'Advent Call To Worship — All',
  opening_title: 'O Come, O Come Emmanuel — LMGM 3',
  psalm_title: 'Let the Lord Enter',
  responsorial_psalm: 'Psalm 24',
  preparation_title: 'O Come Emmanuel — Choir',
  communion_1_title: 'Taste and See — LMGM 281',
  communion_2_title: null,
  praise_title: 'I Know That My Redeemer Lives — Choir',
  closing_title: 'Prepare Ye the Way of the Lord',
  first_reading: 'Isaiah 7:10-14',
  second_reading: 'Romans 1:1-7',
  gospel_acclamation: null,
  gospel: 'Matthew 1:18-24',
};

const settings: WorshipAidSettings = {
  ...DEFAULT_SETTINGS,
  coverTitle: 'Our Lady of Lourdes Catholic Church',
  coverImageUrl: 'https://example.org/cover.jpg',
  spineText: 'www.lourdesatlanta.org',
};

const labels = (entries: { label: string }[]) => entries.map((e) => e.label).filter(Boolean);

describe('SHEETS — the imposition', () => {
  // The one thing that cannot be fixed after the copies are printed. Folded,
  // the front cover has to land on the OUTSIDE, which means it prints to the
  // RIGHT of the back cover on the same sheet.
  it('prints the back cover to the left of the front cover', () => {
    expect(SHEETS[0]).toEqual(['back', 'front']);
  });

  it('prints the inside panels in reading order on the second sheet', () => {
    expect(SHEETS[1]).toEqual(['insideLeft', 'insideRight']);
  });

  it('is exactly two sheets — one folded page', () => {
    expect(SHEETS).toHaveLength(2);
    expect(SHEETS.flat().sort()).toEqual(['back', 'front', 'insideLeft', 'insideRight']);
  });
});

describe('splitCredit', () => {
  it('splits an em-dash hymnal reference off the title', () => {
    expect(splitCredit('O Come, O Come Emmanuel — LMGM 3'))
      .toEqual({ title: 'O Come, O Come Emmanuel', credit: 'LMGM 3' });
  });

  it('accepts an en dash or a spaced hyphen from a hand-typed entry', () => {
    expect(splitCredit('Taste and See – LMGM 281').credit).toBe('LMGM 281');
    expect(splitCredit('Taste and See - LMGM 281').credit).toBe('LMGM 281');
  });

  // A hyphenated title must not be mistaken for a credit.
  it('leaves an unhyphenated title alone', () => {
    expect(splitCredit('Prepare Ye the Way of the Lord'))
      .toEqual({ title: 'Prepare Ye the Way of the Lord', credit: null });
  });

  it('is empty for empty input', () => {
    expect(splitCredit(null)).toEqual({ title: null, credit: null });
    expect(splitCredit('   ')).toEqual({ title: null, credit: null });
  });
});

describe('buildWorshipAid', () => {
  const aid = buildWorshipAid(source, settings, 'https://example.org/psalm.jpg');

  // The cover carries the parish name and the artwork, and nothing else. A
  // season word printed under a mark that already has the season lettered
  // into it says it twice.
  it('puts the church name and art on the cover, and nothing else', () => {
    expect(aid.front).toEqual({
      title: 'Our Lady of Lourdes Catholic Church',
      imageUrl: 'https://example.org/cover.jpg',
    });
  });

  // The Liturgy of the Word stays whole on one panel: split across the fold,
  // the part a congregation follows most closely is the part they lose.
  it('keeps the entire Liturgy of the Word on the first inside panel', () => {
    expect(labels(aid.insideLeft)).toEqual([
      'INTRODUCTORY RITES', 'THE ORDER OF MASS', 'PRELUDE', 'OPENING HYMN',
      'LITURGY OF THE WORD', 'FIRST READING', 'RESPONSORIAL PSALM',
      'SECOND READING', 'GOSPEL', 'HOMILY', 'PROFESSION OF FAITH',
    ]);
  });

  it('opens the facing panel at the Eucharist', () => {
    expect(labels(aid.insideRight)).toEqual([
      'LITURGY OF THE EUCHARIST', 'PREPARATION OF THE ALTAR AND THE GIFTS',
      'EUCHARISTIC PRAYER', 'MEMORIAL ACCLAMATION', 'DOXOLOGY and AMEN', 'OUR FATHER',
    ]);
  });

  it('does not leave the Gospel under a heading about the Eucharist', () => {
    const right = labels(aid.insideRight);
    expect(right).not.toContain('GOSPEL');
    expect(right).not.toContain('SECOND READING');
  });

  it('finishes the communion rite on the back cover', () => {
    expect(labels(aid.back)).toEqual([
      'SIGN OF PEACE', 'LAMB OF GOD', 'COMMUNION', 'SONG OF PRAISE', 'SENDING FORTH',
    ]);
  });

  // An empty heading with nothing under it is worse than no heading: it reads
  // as a mistake in a document handed to a congregation.
  it('omits sections the plan has nothing for', () => {
    expect(labels(aid.insideLeft)).not.toContain('GOSPEL ACCLAMATION');
    // Only one communion hymn was entered, so only one prints.
    expect(labels(aid.back).filter((l) => l === 'COMMUNION')).toHaveLength(1);
  });

  it('drops the composed psalm setting in under the psalm', () => {
    const psalm = aid.insideLeft.find((e) => e.label === 'RESPONSORIAL PSALM');
    expect(psalm?.citation).toBe('Psalm 24');
    expect(psalm?.imageUrl).toBe('https://example.org/psalm.jpg');
  });

  it('splits hymnal references out of the titles it prints', () => {
    const opening = aid.insideLeft.find((e) => e.label === 'OPENING HYMN');
    expect(opening?.title).toBe('O Come, O Come Emmanuel');
    expect(opening?.credit).toBe('LMGM 3');
  });

  it('prints the day and date up the side band', () => {
    expect(aid.sideBand).toEqual({ day: 'Fourth Sunday of Advent', date: 'December 22, 2013' });
  });

  it('places the three boxed notices', () => {
    const notices = [...aid.insideLeft, ...aid.back].filter((e) => e.notice);
    expect(notices).toHaveLength(3);
    expect(notices[0].notice).toMatch(/Welcome to our worship service/);
  });

  it('drops a notice the user cleared rather than printing an empty box', () => {
    const a = buildWorshipAid(source, { ...settings, welcomeNotice: '', sendingNotice: '' });
    expect([...a.insideLeft, ...a.back].filter((e) => e.notice)).toHaveLength(1);
  });

  it('places user images on the panels they were dropped on', () => {
    const a = buildWorshipAid(source, {
      ...settings,
      images: { insideRight: 'https://example.org/art.jpg', back: 'https://example.org/end.jpg' },
    });
    expect(a.insideRight.some((e) => e.imageUrl === 'https://example.org/art.jpg')).toBe(true);
    expect(a.back.some((e) => e.imageUrl === 'https://example.org/end.jpg')).toBe(true);
  });

  it('builds from an empty plan without throwing', () => {
    const blank: AidSource = {
      mass_date: '2026-08-09', observation: null, liturgical_season: null,
      setting_title: null, prelude_title: null, opening_title: null, psalm_title: null,
      responsorial_psalm: null, preparation_title: null, communion_1_title: null,
      communion_2_title: null, praise_title: null, closing_title: null,
      first_reading: null, second_reading: null, gospel_acclamation: null, gospel: null,
    };
    const a = buildWorshipAid(blank, DEFAULT_SETTINGS);
    expect(a.front.title).toBe('');
    expect(labels(a.insideLeft)).toEqual([
      'INTRODUCTORY RITES', 'LITURGY OF THE WORD', 'HOMILY', 'PROFESSION OF FAITH',
    ]);
  });
});

describe('the composed psalm travels with the aid', () => {
  // The phone edition is public and cannot query the tenant's library, so a
  // URL resolved only at edit time would leave the paper showing music and
  // the phone showing prose.
  it('uses the saved engraving when none is passed in', () => {
    const a = buildWorshipAid(source, { ...settings, psalmImageUrl: 'https://example.org/saved.jpg' });
    const psalm = a.insideLeft.find((e) => e.label === 'RESPONSORIAL PSALM');
    expect(psalm?.imageUrl).toBe('https://example.org/saved.jpg');
  });

  it('prefers a freshly resolved engraving over the saved one', () => {
    const a = buildWorshipAid(
      source,
      { ...settings, psalmImageUrl: 'https://example.org/stale.jpg' },
      'https://example.org/fresh.jpg',
    );
    expect(a.insideLeft.find((e) => e.label === 'RESPONSORIAL PSALM')?.imageUrl)
      .toBe('https://example.org/fresh.jpg');
  });

  it('still prints the citation when nothing has been composed', () => {
    const a = buildWorshipAid(source, { ...settings, psalmImageUrl: null });
    const psalm = a.insideLeft.find((e) => e.label === 'RESPONSORIAL PSALM');
    expect(psalm?.citation).toBe('Psalm 24');
    expect(psalm?.imageUrl).toBeNull();
  });

  it('carries the width the engraving was laid out at', () => {
    // Engraved music is not a picture: bars per system, room per syllable and
    // staff size were all decided at this width, so the panel has to print it
    // at this width rather than at whatever its aspect ratio and the height
    // cap happen to agree on.
    const a = buildWorshipAid(source, { ...settings, psalmImageUrl: 'https://example.org/psalm.jpg' });
    expect(a.insideLeft.find((e) => e.label === 'RESPONSORIAL PSALM')?.imageWidthIn)
      .toBe(PSALM_WIDTH_IN);
  });

  it('leaves artwork free to fit the panel', () => {
    // A photograph has no design width. Pinning one would shrink every image
    // a user drops into a panel to the psalm's four inches.
    const a = buildWorshipAid(source, {
      ...settings,
      images: { ...settings.images, insideRight: 'https://example.org/art.jpg' },
    });
    const art = a.insideRight.find((e) => e.imageUrl === 'https://example.org/art.jpg');
    expect(art).toBeTruthy();
    expect(art?.imageWidthIn).toBeUndefined();
  });
});

describe('formatLongDate', () => {
  it('writes the date the way the printed band does', () => {
    expect(formatLongDate('2013-12-22')).toBe('December 22, 2013');
    expect(formatLongDate('2026-08-09')).toBe('August 9, 2026');
  });

  // Parsed as digits, never through Date: `new Date('2026-08-09')` is UTC
  // midnight and prints as the 8th anywhere west of Greenwich.
  it('does not shift the date across a timezone', () => {
    expect(formatLongDate('2026-01-01')).toBe('January 1, 2026');
  });

  it('passes anything unparseable straight through', () => {
    expect(formatLongDate('')).toBe('');
    expect(formatLongDate('not a date')).toBe('not a date');
  });
});


describe('panelSpacing', () => {
  it('defaults to normal spacing', () => {
    expect(panelSpacing(DEFAULT_SETTINGS, 'insideLeft')).toBe(1);
  });

  it('returns what the user chose', () => {
    expect(panelSpacing({ ...DEFAULT_SETTINGS, spacing: { back: 1.4 } }, 'back')).toBe(1.4);
  });

  // A stored value can come from an older record or a hand-edited one; below
  // the floor entries collide, above the ceiling a panel runs past the fold.
  it('clamps a value that would break the panel', () => {
    expect(panelSpacing({ ...DEFAULT_SETTINGS, spacing: { back: 9 } }, 'back')).toBe(SPACING_MAX);
    expect(panelSpacing({ ...DEFAULT_SETTINGS, spacing: { back: 0 } }, 'back')).toBe(SPACING_MIN);
  });

  it('ignores a value that is not a usable number', () => {
    const bad = { ...DEFAULT_SETTINGS, spacing: { back: NaN } };
    expect(panelSpacing(bad, 'back')).toBe(1);
    expect(panelSpacing({ ...DEFAULT_SETTINGS, spacing: {} }, 'front')).toBe(1);
  });
});

describe('cover sizing', () => {
  it('defaults to a readable title and a full-width picture', () => {
    expect(coverTitleSize(DEFAULT_SETTINGS)).toBe(COVER_TITLE_DEFAULT);
    expect(coverImageScale(DEFAULT_SETTINGS)).toBe(COVER_IMAGE_DEFAULT);
  });

  it('returns what the user set', () => {
    expect(coverTitleSize({ ...DEFAULT_SETTINGS, coverTitleSize: 14 })).toBe(14);
    expect(coverImageScale({ ...DEFAULT_SETTINGS, coverImageScale: 0.6 })).toBe(0.6);
  });

  // Below the floor the title is unreadable at arm's length in a pew; above
  // the ceiling it crowds the artwork off the panel.
  it('clamps a value that would ruin the cover', () => {
    expect(coverTitleSize({ ...DEFAULT_SETTINGS, coverTitleSize: 200 })).toBe(COVER_TITLE_MAX);
    expect(coverTitleSize({ ...DEFAULT_SETTINGS, coverTitleSize: 1 })).toBe(COVER_TITLE_MIN);
    expect(coverImageScale({ ...DEFAULT_SETTINGS, coverImageScale: 5 })).toBe(COVER_IMAGE_MAX);
    expect(coverImageScale({ ...DEFAULT_SETTINGS, coverImageScale: 0 })).toBe(COVER_IMAGE_MIN);
  });

  it('ignores a stored value that is not a usable number', () => {
    expect(coverTitleSize({ ...DEFAULT_SETTINGS, coverTitleSize: NaN })).toBe(COVER_TITLE_DEFAULT);
    expect(coverImageScale({ ...DEFAULT_SETTINGS, coverImageScale: undefined })).toBe(COVER_IMAGE_DEFAULT);
  });
});
