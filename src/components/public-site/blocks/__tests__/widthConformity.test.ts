import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every block sits in the same column.
 *
 * PublicSiteView renders blocks bare — it adds no container — so each block is
 * responsible for its own width. That works until one forgets, and then it
 * alone runs edge to edge while its neighbours stay in the column. The RSVP
 * block did exactly that: full-bleed between a constrained hero above and a
 * constrained auditions block below.
 *
 * This is a source scan, not a render, so it is a coarse net: it proves each
 * block CONSTRAINS itself somewhere, not that the constraint sits on the
 * outermost element. It catches the failure that actually happened — a block
 * with no content-column constraint at all — and it is stable against markup
 * changes that a JSX-parsing version would break on.
 */

const BLOCKS_DIR = join(__dirname, '..');
const COLUMN = 'max-w-6xl mx-auto';

const blockFiles = readdirSync(BLOCKS_DIR).filter((f) => f.endsWith('.tsx'));

/**
 * Just the public Render, without the settings form.
 *
 * EditorForm renders in the builder's settings sheet — a normal viewport-sized
 * panel, where `sm:` is the correct variant. Only the block's own output has
 * to answer to the container.
 */
function renderSource(file: string): string {
  const src = readFileSync(join(BLOCKS_DIR, file), 'utf-8');
  const start = src.search(/function Render\b/);
  if (start === -1) return src;
  const rest = src.slice(start);
  const end = rest.search(/function EditorForm\b/);
  return end === -1 ? rest : rest.slice(0, end);
}

describe('public-site block width conformity', () => {
  it('finds the blocks to check', () => {
    expect(blockFiles.length).toBeGreaterThan(20);
  });

  it.each(blockFiles)('%s constrains itself to the shared content column', (file) => {
    const src = readFileSync(join(BLOCKS_DIR, file), 'utf-8');
    expect(src).toContain(COLUMN);
  });

  /**
   * The builder previews a phone by narrowing a CONTAINER inside a wide
   * window, so `sm:`/`lg:` — which read the viewport — report "desktop" and
   * the preview lays out wrong. `cq-*` variants resolve against the container.
   * Dialogs are portaled outside it, so they legitimately keep `sm:`.
   */
  it.each(blockFiles)('%s uses container queries for its own layout', (file) => {
    const gridBreakpoints = renderSource(file).match(/(?<!cq-)(sm|md|lg):grid-cols-/g) ?? [];
    expect(gridBreakpoints).toEqual([]);
  });
});
