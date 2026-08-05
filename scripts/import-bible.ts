#!/usr/bin/env npx tsx
/**
 * Generates SQL to populate gw_bible_* from any eBible.org USFM release.
 *
 *   curl -sSLo /tmp/t.zip https://ebible.org/Scriptures/engDRA_usfm.zip
 *   unzip -q -o /tmp/t.zip -d /tmp/t
 *   npx tsx scripts/import-webce.ts --dir /tmp/t --code DRA \
 *     --name "Douay-Rheims 1899" --out /tmp/dra.sql
 *   psql "$DB_URL" -v ON_ERROR_STOP=1 -f /tmp/dra.sql
 *
 * eBible filenames carry canon order as a numeric prefix (02-GEN … 66-DAG …
 * 70-MAT … 96-REV). Verified against the real releases: the Old Testament
 * starts at 02, the deuterocanon is interleaved by book order, and the New
 * Testament starts at 70. Deuterocanon presence is DETECTED from the files
 * rather than declared, because it varies by translation — WEBCE and
 * Douay-Rheims have it, the Berean Standard Bible does not.
 *
 * ONLY PUBLIC-DOMAIN TEXTS. Every translation loaded through this script must
 * be public domain; the copyrighted ones (NIV, ESV, NABRE, NRSV…) require a
 * paid licence and must not be imported here.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUsfmBook } from '../src/lib/prayer/usfm';
import { lit, header, FOOTER } from './prayer-sql';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const dir = arg('dir', '/tmp/webc');
const out = arg('out', '/tmp/bible.sql');
const code = arg('code', 'WEBCE');
const name = arg('name', 'World English Bible (Catholic)');
const attribution = arg(
  'attribution',
  `${name}. Public domain. Source: eBible.org.`,
);

const DEUTEROCANON = new Set(['TOB', 'JDT', 'ESG', 'WIS', 'SIR', 'BAR', '1MA', '2MA', 'DAG']);
const NT_START = 70;
const BATCH = 500;

const files = readdirSync(dir).filter((f) => f.endsWith('.usfm')).sort();
const hasDeuterocanon = files.some((f) =>
  ['TOB', 'JDT', 'WIS', 'SIR', 'BAR', '1MA', '2MA'].some((d) => f.includes(d)),
);

const statements: string[] = [
  `INSERT INTO public.gw_bible_translations
  (code, name, language, is_public_domain, has_deuterocanon, attribution)
VALUES (${lit(code)}, ${lit(name)}, 'en', TRUE, ${hasDeuterocanon ? 'TRUE' : 'FALSE'},
        ${lit(attribution)})
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, has_deuterocanon = EXCLUDED.has_deuterocanon,
  attribution = EXCLUDED.attribution;`,
];

let totalVerses = 0;
let bookCount = 0;

for (const file of files) {
  const canonOrder = Number(file.slice(0, 2));
  const book = parseUsfmBook(readFileSync(join(dir, file), 'utf8'));
  if (!book.usfmCode || !book.verses.length) {
    console.log(`skip ${file} (no verses)`);
    continue;
  }

  // A book whose (chapter, verse) pairs repeat cannot be stored — the unique
  // reference index rejects it, and ON CONFLICT can't resolve two identical
  // rows in one statement. The known cause is LETTERED chapters: Greek Esther
  // in some releases uses \c A .. \c F for the additions, which the parser
  // (chapter is an integer, by schema) collapses onto the preceding number.
  // Skip the book loudly rather than write mangled references.
  const seen = new Set<string>();
  const dupes = book.verses.filter((v) => {
    const k = `${v.chapter}:${v.verse}`;
    if (seen.has(k)) return true;
    seen.add(k);
    return false;
  });
  if (dupes.length) {
    console.warn(
      `!! SKIPPING ${book.usfmCode} in ${code}: ${dupes.length} duplicate verse ` +
      `references (likely lettered chapters, e.g. Greek Esther). ` +
      `This book will be MISSING from ${code}.`,
    );
    continue;
  }

  const testament = DEUTEROCANON.has(book.usfmCode)
    ? 'DC'
    : canonOrder >= NT_START
      ? 'NT'
      : 'OT';

  statements.push(
    `INSERT INTO public.gw_bible_books (translation_id, usfm_code, name, canon_order, testament)
SELECT t.id, ${lit(book.usfmCode)}, ${lit(book.name || book.usfmCode)}, ${canonOrder}, ${lit(testament)}
FROM public.gw_bible_translations t WHERE t.code = ${lit(code)}
ON CONFLICT (translation_id, usfm_code) DO UPDATE SET
  name = EXCLUDED.name, canon_order = EXCLUDED.canon_order,
  testament = EXCLUDED.testament;`,
  );

  for (let i = 0; i < book.verses.length; i += BATCH) {
    const rows = book.verses
      .slice(i, i + BATCH)
      .map((v) => `(${v.chapter}, ${v.verse}, ${lit(v.text)})`)
      .join(',\n       ');
    statements.push(
      `INSERT INTO public.gw_bible_verses (book_id, chapter, verse, text)
SELECT b.id, x.chapter, x.verse, x.text
FROM public.gw_bible_books b
JOIN public.gw_bible_translations t ON t.id = b.translation_id AND t.code = ${lit(code)}
CROSS JOIN (VALUES
       ${rows}
) AS x(chapter, verse, text)
WHERE b.usfm_code = ${lit(book.usfmCode)}
ON CONFLICT (book_id, chapter, verse) DO UPDATE SET text = EXCLUDED.text;`,
    );
  }

  bookCount++;
  totalVerses += book.verses.length;
}

writeFileSync(
  out,
  header(
    `The Bible — ${name}`,
    'eBible.org USFM release (public domain)',
    totalVerses,
  ) + statements.join('\n\n') + FOOTER,
);

console.log(`${code}: ${bookCount} books, ${totalVerses} verses, deuterocanon=${hasDeuterocanon} -> ${out}`);
