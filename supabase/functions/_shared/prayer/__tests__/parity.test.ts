import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `supabase/functions/_shared/prayer/{books,citation}.ts` are deliberate
 * duplicates of `src/lib/prayer/{books,citation}.ts` (Deno edge functions
 * cannot import across the `supabase/functions/` deploy boundary — see
 * scripts/deploy-functions.sh). This test fails loudly the moment the two
 * copies drift, since citation parsing is supposed to live in exactly one
 * place logically even though it exists in two files physically.
 */

const ROOT = join(__dirname, '..', '..', '..', '..', '..');

/**
 * The Deno copy carries a few extra lines a byte-for-byte comparison can't
 * see past: a "DELIBERATE DUPLICATE" doc-comment block (plus its blank
 * comment-line lead-in), and './books.ts' import specifiers (Deno requires
 * the extension; the frontend build does not allow it). Strip both before
 * comparing so the assertion is "the code is identical," not "the two
 * comments about the code match."
 */
function stripDuplicateNotice(source: string): string {
  const out: string[] = [];
  let dropping = false;
  for (const line of source.split('\n')) {
    if (/DELIBERATE DUPLICATE/.test(line)) {
      if (out.length && out[out.length - 1].trim() === '*') out.pop();
      dropping = true;
      continue;
    }
    if (dropping) {
      const trimmed = line.trim();
      if (trimmed === '*/') { dropping = false; out.push(line); }
      else if (trimmed === '') { dropping = false; }
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/ from '(\.\/[a-zA-Z]+)\.ts';/g, " from '$1';");
}

describe('prayer citation parser parity (frontend vs. edge function)', () => {
  it('books.ts is byte-identical apart from the documented duplication notice', () => {
    const canonical = readFileSync(join(ROOT, 'src/lib/prayer/books.ts'), 'utf8');
    const ported = readFileSync(
      join(ROOT, 'supabase/functions/_shared/prayer/books.ts'),
      'utf8',
    );
    expect(stripDuplicateNotice(ported)).toBe(canonical);
  });

  it('citation.ts is byte-identical apart from the documented duplication notice', () => {
    const canonical = readFileSync(join(ROOT, 'src/lib/prayer/citation.ts'), 'utf8');
    const ported = readFileSync(
      join(ROOT, 'supabase/functions/_shared/prayer/citation.ts'),
      'utf8',
    );
    expect(stripDuplicateNotice(ported)).toBe(canonical);
  });
});
