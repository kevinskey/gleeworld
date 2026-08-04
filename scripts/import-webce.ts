#!/usr/bin/env npx tsx
/**
 * Generates SQL to populate gw_bible_* from the World English Bible Catholic
 * Edition USFM release (public domain).
 *
 *   curl -sSLo /tmp/webc.zip https://ebible.org/Scriptures/eng-web-c_usfm.zip
 *   unzip -q -o /tmp/webc.zip -d /tmp/webc
 *   npx tsx scripts/import-webce.ts --dir /tmp/webc --out /tmp/webce.sql
 *   psql "$DB_URL" -v ON_ERROR_STOP=1 -f /tmp/webce.sql
 *
 * eBible filenames carry the Catholic canon order as a numeric prefix
 * (02-GEN … 66-DAG … 70-MAT … 96-REV). Verified against the real release: the
 * Old Testament starts at 02, the deuterocanon is interleaved by book order,
 * and the New Testament starts at 70.
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
const out = arg('out', '/tmp/webce.sql');

const DEUTEROCANON = new Set(['TOB', 'JDT', 'ESG', 'WIS', 'SIR', 'BAR', '1MA', '2MA', 'DAG']);
const NT_START = 70;
const BATCH = 500;

const statements: string[] = [
  `INSERT INTO public.gw_bible_translations
  (code, name, language, is_public_domain, has_deuterocanon, attribution)
VALUES ('WEBCE', 'World English Bible (Catholic)', 'en', TRUE, TRUE,
        'World English Bible (Catholic Edition). Public domain. Source: eBible.org.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, has_deuterocanon = EXCLUDED.has_deuterocanon,
  attribution = EXCLUDED.attribution;`,
];

const files = readdirSync(dir).filter((f) => f.endsWith('.usfm')).sort();
let totalVerses = 0;
let bookCount = 0;

for (const file of files) {
  const canonOrder = Number(file.slice(0, 2));
  const book = parseUsfmBook(readFileSync(join(dir, file), 'utf8'));
  if (!book.usfmCode || !book.verses.length) {
    console.log(`skip ${file} (no verses)`);
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
FROM public.gw_bible_translations t WHERE t.code = 'WEBCE'
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
JOIN public.gw_bible_translations t ON t.id = b.translation_id AND t.code = 'WEBCE'
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
    'Prayer module — World English Bible (Catholic Edition)',
    'eBible.org eng-web-c USFM release (public domain)',
    totalVerses,
  ) + statements.join('\n\n') + FOOTER,
);

console.log(`${bookCount} books, ${totalVerses} verses -> ${out}`);
