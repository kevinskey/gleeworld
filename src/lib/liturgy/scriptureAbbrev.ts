// Scripture citation abbreviations → spoken book names (Kevin, 2026-08-17:
// "Ps = psalms, Dt = Deuteronomy, Mt = Matthew — program the rest").
//
// Used on the SPOKEN citation only — the display keeps the compact form.
// Guard rails: an abbreviation expands only when it starts with a capital
// letter AND a chapter/verse number follows ("Is 5:1" → "Isaiah 5:1"),
// so prose words like "Is", "Am", "At" are never mangled. Numbered books
// are announced the way a lector says them: "1 Cor" → "First Corinthians".
// Covers the full 73-book Catholic canon in the USCCB/Universalis
// abbreviation variants.

const BOOKS: Record<string, string> = {
  // Pentateuch + histories
  gn: 'Genesis', gen: 'Genesis',
  ex: 'Exodus', exod: 'Exodus',
  lv: 'Leviticus', lev: 'Leviticus',
  nm: 'Numbers', num: 'Numbers',
  dt: 'Deuteronomy', deut: 'Deuteronomy',
  jos: 'Joshua', josh: 'Joshua',
  jgs: 'Judges', jg: 'Judges', judg: 'Judges',
  ru: 'Ruth',
  ezr: 'Ezra',
  neh: 'Nehemiah',
  tb: 'Tobit', tob: 'Tobit',
  jdt: 'Judith',
  est: 'Esther',
  // Wisdom books
  jb: 'Job',
  ps: 'Psalm', pss: 'Psalm',
  prv: 'Proverbs', prov: 'Proverbs',
  eccl: 'Ecclesiastes', qo: 'Ecclesiastes', qoh: 'Ecclesiastes',
  sg: 'Song of Songs', ct: 'Song of Songs', cant: 'Song of Songs',
  wis: 'Wisdom', ws: 'Wisdom',
  sir: 'Sirach',
  // Prophets
  is: 'Isaiah', isa: 'Isaiah',
  jer: 'Jeremiah',
  lam: 'Lamentations',
  bar: 'Baruch',
  ez: 'Ezekiel', ezk: 'Ezekiel', ezek: 'Ezekiel',
  dn: 'Daniel', dan: 'Daniel',
  hos: 'Hosea',
  jl: 'Joel',
  am: 'Amos',
  ob: 'Obadiah', obad: 'Obadiah',
  jon: 'Jonah',
  mi: 'Micah', mic: 'Micah',
  na: 'Nahum', nah: 'Nahum',
  hb: 'Habakkuk', hab: 'Habakkuk',
  zep: 'Zephaniah', zeph: 'Zephaniah',
  hg: 'Haggai', hag: 'Haggai',
  zec: 'Zechariah', zech: 'Zechariah',
  mal: 'Malachi',
  // Gospels + New Testament
  mt: 'Matthew', matt: 'Matthew',
  mk: 'Mark',
  lk: 'Luke',
  jn: 'John',
  acts: 'Acts',
  rom: 'Romans',
  gal: 'Galatians',
  eph: 'Ephesians',
  phil: 'Philippians',
  col: 'Colossians',
  ti: 'Titus', tit: 'Titus',
  phlm: 'Philemon', philem: 'Philemon',
  heb: 'Hebrews',
  jas: 'James',
  jude: 'Jude',
  rv: 'Revelation', rev: 'Revelation', apoc: 'Revelation',
};

// Books that carry a leading 1/2/3 — spoken with an ordinal.
const NUMBERED: Record<string, string> = {
  sm: 'Samuel', sam: 'Samuel',
  kgs: 'Kings', kg: 'Kings',
  chr: 'Chronicles', chron: 'Chronicles',
  mc: 'Maccabees', mac: 'Maccabees', macc: 'Maccabees',
  cor: 'Corinthians',
  thes: 'Thessalonians', thess: 'Thessalonians',
  tm: 'Timothy', tim: 'Timothy',
  pt: 'Peter', pet: 'Peter',
  jn: 'John',
};

const ORDINAL: Record<string, string> = { '1': 'First', '2': 'Second', '3': 'Third' };

export function expandScriptureAbbrevs(text: string): string {
  return (
    text
      // Numbered books first, so "1 Jn 4:7" resolves before the bare-"Jn" pass.
      // Requires a digit ahead: Philemon and Jude cite verse-only ("Phlm 9"),
      // so the lookahead accepts a bare verse number too.
      .replace(/\b([123])\s*([A-Z][a-z]*)\.?(?=\s+\d)/g, (m, n: string, ab: string) => {
        const full = NUMBERED[ab.toLowerCase()];
        return full ? `${ORDINAL[n]} ${full}` : m;
      })
      .replace(/\b([A-Z][a-z]*)\.?(?=\s+\d)/g, (m, ab: string) => BOOKS[ab.toLowerCase()] ?? m)
  );
}
