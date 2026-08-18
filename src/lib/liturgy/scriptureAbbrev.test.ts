import { describe, it, expect } from 'vitest';
import { expandScriptureAbbrevs } from './scriptureAbbrev';

describe('expandScriptureAbbrevs — citations read like a lector', () => {
  it('expands the everyday abbreviations', () => {
    expect(expandScriptureAbbrevs('Ps 95:1-2')).toBe('Psalm 95:1-2');
    expect(expandScriptureAbbrevs('Dt 4:32-40')).toBe('Deuteronomy 4:32-40');
    expect(expandScriptureAbbrevs('Mt 5:1-12')).toBe('Matthew 5:1-12');
    expect(expandScriptureAbbrevs('Gn 1:1-2:2')).toBe('Genesis 1:1-2:2');
    expect(expandScriptureAbbrevs('Is 55:10-11')).toBe('Isaiah 55:10-11');
    expect(expandScriptureAbbrevs('Rv 21:1-5')).toBe('Revelation 21:1-5');
    expect(expandScriptureAbbrevs('Sir 3:17-20')).toBe('Sirach 3:17-20');
    expect(expandScriptureAbbrevs('Ez 34:11-16')).toBe('Ezekiel 34:11-16');
    expect(expandScriptureAbbrevs('Ezr 1:1-6')).toBe('Ezra 1:1-6');
  });

  it('speaks numbered books with ordinals, the way a lector announces them', () => {
    expect(expandScriptureAbbrevs('1 Cor 13:4-13')).toBe('First Corinthians 13:4-13');
    expect(expandScriptureAbbrevs('2 Sm 7:1-5')).toBe('Second Samuel 7:1-5');
    expect(expandScriptureAbbrevs('1 Kgs 19:9-13')).toBe('First Kings 19:9-13');
    expect(expandScriptureAbbrevs('2 Thes 2:16-3:5')).toBe('Second Thessalonians 2:16-3:5');
    expect(expandScriptureAbbrevs('1 Jn 4:7-16')).toBe('First John 4:7-16');
    expect(expandScriptureAbbrevs('3 Jn 5-8')).toBe('Third John 5-8');
    expect(expandScriptureAbbrevs('2 Mc 7:1-14')).toBe('Second Maccabees 7:1-14');
  });

  it('accepts trailing periods and leaves full names + plain prose alone', () => {
    expect(expandScriptureAbbrevs('Gen. 1:1')).toBe('Genesis 1:1');
    expect(expandScriptureAbbrevs('Matthew 5:1-12')).toBe('Matthew 5:1-12');
    // No chapter number after it = not a citation; never mangle prose.
    expect(expandScriptureAbbrevs('This Is the day')).toBe('This Is the day');
    expect(expandScriptureAbbrevs('At 3 pm')).toBe('At 3 pm');
  });

  it('covers the whole Catholic canon citation set', () => {
    const cases: Array<[string, string]> = [
      ['Ex 3:1', 'Exodus'], ['Lv 19:1', 'Leviticus'], ['Nm 6:22', 'Numbers'],
      ['Jos 24:1', 'Joshua'], ['Jgs 6:11', 'Judges'], ['Ru 1:1', 'Ruth'],
      ['Ezr 9:5', 'Ezra'], ['Neh 8:1', 'Nehemiah'], ['Tb 12:1', 'Tobit'],
      ['Jdt 8:2', 'Judith'], ['Est 4:17', 'Esther'], ['Jb 7:1', 'Job'],
      ['Prv 8:22', 'Proverbs'], ['Eccl 1:2', 'Ecclesiastes'], ['Qo 1:2', 'Ecclesiastes'],
      ['Sg 2:8', 'Song of Songs'], ['Ct 2:8', 'Song of Songs'], ['Wis 9:13', 'Wisdom'],
      ['Jer 1:4', 'Jeremiah'], ['Lam 3:17', 'Lamentations'], ['Bar 4:5', 'Baruch'],
      ['Dn 7:9', 'Daniel'], ['Hos 6:3', 'Hosea'], ['Jl 2:12', 'Joel'],
      ['Am 7:12', 'Amos'], ['Ob 1:1', 'Obadiah'], ['Jon 3:1', 'Jonah'],
      ['Mi 5:1', 'Micah'], ['Na 1:15', 'Nahum'], ['Hb 1:2', 'Habakkuk'],
      ['Zep 3:14', 'Zephaniah'], ['Hg 1:1', 'Haggai'], ['Zec 9:9', 'Zechariah'],
      ['Mal 3:1', 'Malachi'], ['Mk 1:14', 'Mark'], ['Lk 24:13', 'Luke'],
      ['Jn 6:24', 'John'], ['Rom 8:28', 'Romans'], ['Gal 5:1', 'Galatians'],
      ['Eph 1:3', 'Ephesians'], ['Phil 2:6', 'Philippians'], ['Col 3:1', 'Colossians'],
      ['Ti 2:11', 'Titus'], ['Phlm 9', 'Philemon'], ['Heb 4:12', 'Hebrews'],
      ['Jas 2:14', 'James'], ['Jude 17', 'Jude'],
    ];
    for (const [input, book] of cases) {
      expect(expandScriptureAbbrevs(input), input).toContain(book);
    }
  });
});
