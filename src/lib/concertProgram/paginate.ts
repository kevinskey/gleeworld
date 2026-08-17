import type { ProgramBlock } from './types';

export type FlowUnit =
  | { type: 'block'; blockId: string }
  | { type: 'group-header'; blockId: string }
  | { type: 'piece-line'; blockId: string; pieceId: string }
  | { type: 'group-credit'; blockId: string }
  | { type: 'roster-section'; blockId: string; sectionId: string };

export function unitKey(u: FlowUnit): string {
  switch (u.type) {
    case 'block': return `block:${u.blockId}`;
    case 'group-header': return `gh:${u.blockId}`;
    case 'piece-line': return `pl:${u.blockId}:${u.pieceId}`;
    case 'group-credit': return `gc:${u.blockId}`;
    case 'roster-section': return `rs:${u.blockId}:${u.sectionId}`;
  }
}

export function blocksToUnits(blocks: ProgramBlock[], rosterSectionIds: string[]): FlowUnit[] {
  const units: FlowUnit[] = [];
  for (const b of blocks) {
    if (b.kind === 'piece-group') {
      if (b.sectionHeading !== null) units.push({ type: 'group-header', blockId: b.id });
      for (const pieceId of b.pieceIds) units.push({ type: 'piece-line', blockId: b.id, pieceId });
      if (b.creditLine !== null) units.push({ type: 'group-credit', blockId: b.id });
    } else if (b.kind === 'roster') {
      for (const sectionId of rosterSectionIds) units.push({ type: 'roster-section', blockId: b.id, sectionId });
    } else {
      units.push({ type: 'block', blockId: b.id });
    }
  }
  return units;
}

export interface PageItem { unit: FlowUnit; continued?: boolean }
export interface PaginateResult { pages: PageItem[][]; oversized: string[] }

const h = (heights: Map<string, number>, u: FlowUnit) => heights.get(unitKey(u)) ?? 0;

export function paginateProgram(
  blocks: ProgramBlock[],
  rosterSectionIds: string[],
  heights: Map<string, number>,
  pageHeightIn: number,
): PaginateResult {
  const pages: PageItem[][] = [];
  const oversized: string[] = [];
  let current: PageItem[] = [];
  let used = 0;

  const flush = () => { if (current.length) { pages.push(current); current = []; used = 0; } };
  const place = (item: PageItem, height: number) => { current.push(item); used += height; };

  for (const b of blocks) {
    if (b.kind === 'piece-group') {
      const headerU: FlowUnit | null = b.sectionHeading !== null ? { type: 'group-header', blockId: b.id } : null;
      const creditU: FlowUnit | null = b.creditLine !== null ? { type: 'group-credit', blockId: b.id } : null;
      const lineUs: FlowUnit[] = b.pieceIds.map((pieceId) => ({ type: 'piece-line', blockId: b.id, pieceId }));
      const headerH = headerU ? h(heights, headerU) : 0;
      const creditH = creditU ? h(heights, creditU) : 0;
      const total = headerH + creditH + lineUs.reduce((s, u) => s + h(heights, u), 0);

      if (total <= pageHeightIn - used) {
        if (headerU) place({ unit: headerU }, headerH);
        for (const u of lineUs) place({ unit: u }, h(heights, u));
        if (creditU) place({ unit: creditU }, creditH);
        continue;
      }
      if (total <= pageHeightIn) { // fits a fresh page whole
        flush();
        if (headerU) place({ unit: headerU }, headerH);
        for (const u of lineUs) place({ unit: u }, h(heights, u));
        if (creditU) place({ unit: creditU }, creditH);
        continue;
      }
      // Last resort: split at piece boundaries; repeat header as "(continued)".
      let started = false;
      const ensureHeader = () => {
        if (!headerU) return;
        place({ unit: headerU, ...(started ? { continued: true as const } : {}) }, headerH);
      };
      ensureHeader(); started = true;
      for (const u of lineUs) {
        const lh = h(heights, u);
        if (lh > pageHeightIn - used && current.length) { flush(); ensureHeader(); }
        place({ unit: u }, lh);
      }
      if (creditU) {
        if (creditH > pageHeightIn - used && current.length) { flush(); ensureHeader(); }
        place({ unit: creditU }, creditH);
      }
      continue;
    }

    const units: FlowUnit[] = b.kind === 'roster'
      ? rosterSectionIds.map((sectionId) => ({ type: 'roster-section', blockId: b.id, sectionId }))
      : [{ type: 'block', blockId: b.id }];
    for (const u of units) {
      const uh = h(heights, u);
      if (uh > pageHeightIn) {
        flush();
        oversized.push(unitKey(u));
        place({ unit: u }, uh);
        flush();
        continue;
      }
      if (uh > pageHeightIn - used) flush();
      place({ unit: u }, uh);
    }
  }
  flush();
  if (pages.length === 0) pages.push([]);
  return { pages, oversized };
}
