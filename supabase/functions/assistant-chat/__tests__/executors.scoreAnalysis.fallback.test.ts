import { describe, it, expect } from 'vitest';
import { executeServerTool } from '../executors';

// Duplicate-copy stub: tables carry {list, maybeSingle: [queued results]} so
// the first gw_parttrack_scores lookup can miss while the fallback list hits.
type TableSpec = { list?: unknown[]; maybeSingle?: unknown[] };
function stubQueued(tables: Record<string, TableSpec>) {
  return {
    from: (table: string) => {
      const spec = tables[table] ?? {};
      const builder: any = {};
      for (const m of ['select', 'eq', 'or', 'ilike', 'order', 'limit', 'not', 'in']) {
        builder[m] = () => builder;
      }
      builder.maybeSingle = () =>
        Promise.resolve({ data: (spec.maybeSingle ?? []).shift() ?? null, error: null });
      builder.then = (resolve: (v: unknown) => void) =>
        resolve({ data: spec.list ?? [], error: null });
      return builder;
    },
  } as any;
}

const ANALYSIS = {
  v: 1, computed_at: '2026-08-12T05:00:00+00:00',
  key: { initial: 'D major', changes: 0 },
  time_signatures: ['4/4'], tempo_bpm: 92, measures: 120,
  parts: [{ source_part_index: 0, source_staff: null, source_voice: null,
            role: 'soprano', label: 'Soprano', range: { low: 'C4', high: 'G5' } }],
};

const ANALYZED_ROW = {
  id: 'pt1', sheet_music_id: 'copy-analyzed', analysis: ANALYSIS,
  source_type: 'pdf_omr', status: 'ready', validation_report: [],
  tempo_override_bpm: null, manifest: { duration_ms: 240_000 }, error_message: null,
};

describe('get_score_analysis duplicate-copy fallback', () => {
  it('answers from an analyzed same-title copy and names it', async () => {
    const supabase = stubQueued({
      gw_parttrack_scores: { maybeSingle: [null], list: [ANALYZED_ROW] },
      gw_sheet_music: {
        maybeSingle: [{ title: 'A Choice to Change the World SSAA' }],
        list: [
          { id: 'copy-asked', title: 'A Choice to Change the World SSAA' },
          { id: 'copy-analyzed', title: 'A Choice to Change the World' },
        ],
      },
      gw_parttrack_parts: { list: [] },
    });
    const { replyJson } = await executeServerTool('get_score_analysis',
      { score_id: 'copy-asked' }, { supabase, role: 'admin' });
    const out = JSON.parse(replyJson);
    expect(out.analyzed).toBe(true);
    expect(out.key.initial).toBe('D major');
    expect(out.matched_copy).toBe('A Choice to Change the World');
    expect(out.matched_copy_note).toContain('different library copy');
  });

  it('still misses honestly when no copy of the title is analyzed', async () => {
    const supabase = stubQueued({
      gw_parttrack_scores: { maybeSingle: [null], list: [] },
      gw_sheet_music: {
        maybeSingle: [{ title: 'A Choice to Change the World SSAA' }],
        list: [],
      },
    });
    const { replyJson } = await executeServerTool('get_score_analysis',
      { score_id: 'copy-asked' }, { supabase, role: 'member' });
    const out = JSON.parse(replyJson);
    expect(out.analyzed).toBe(false);
    expect(out.matched_copy).toBeUndefined();
    expect(out.hint).toContain('director');
  });

  it('does not fall back across unrelated titles', async () => {
    const supabase = stubQueued({
      gw_parttrack_scores: { maybeSingle: [null], list: [ANALYZED_ROW] },
      gw_sheet_music: {
        maybeSingle: [{ title: 'Total Praise' }],
        list: [
          { id: 'copy-asked', title: 'Total Praise' },
          { id: 'copy-analyzed', title: 'A Choice to Change the World' },
        ],
      },
    });
    const { replyJson } = await executeServerTool('get_score_analysis',
      { score_id: 'copy-asked' }, { supabase, role: 'member' });
    expect(JSON.parse(replyJson).analyzed).toBe(false);
  });
});
