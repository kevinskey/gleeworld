import { describe, it, expect } from 'vitest';
import { executeServerTool } from '../executors';

// Per-table stub: routes from(table) to that table's rows. maybeSingle()
// resolves the first row or null; awaiting the builder resolves the list.
function stubTables(tables: Record<string, unknown[]>, error: { message: string } | null = null) {
  return {
    from: (table: string) => {
      const rows = tables[table] ?? [];
      const builder: any = {};
      for (const m of ['select', 'eq', 'or', 'ilike', 'order', 'limit']) builder[m] = () => builder;
      builder.maybeSingle = () => Promise.resolve({ data: (rows[0] ?? null), error });
      builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error });
      return builder;
    },
  } as any;
}

const ANALYSIS = {
  v: 1,
  computed_at: '2026-08-11T22:00:00+00:00',
  key: { initial: 'F major', changes: 1 },
  time_signatures: ['4/4', '3/4'],
  tempo_bpm: 96,
  measures: 84,
  parts: [
    { source_part_index: 0, source_staff: null, source_voice: null,
      role: 'soprano', label: 'Soprano', range: { low: 'C4', high: 'G5' } },
    { source_part_index: 1, source_staff: null, source_voice: null,
      role: 'other', label: 'Spoken', range: null },
  ],
};

const PART_ROWS = [
  { source_part_index: 0, source_staff: null, source_voice: null,
    role: 'soprano_1', label: 'Soprano I', include: true },
  { source_part_index: 1, source_staff: null, source_voice: null,
    role: 'other', label: 'Spoken', include: false },
];

function scoreRow(over: Record<string, unknown> = {}) {
  return {
    id: 'pt1', analysis: ANALYSIS, source_type: 'pdf_omr', status: 'ready',
    validation_report: [{ code: 'omr_beta', severity: 'warning', message: 'x' }],
    tempo_override_bpm: null, manifest: { duration_ms: 210_000 }, error_message: null,
    ...over,
  };
}

describe('get_score_analysis executor', () => {
  it('missing score_id is an error', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', {},
      { supabase: stubTables({}) });
    expect(JSON.parse(replyJson).error).toContain('score_id');
  });

  it('no PartTrack row → honest miss with member hint', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [] }), role: 'member' });
    const out = JSON.parse(replyJson);
    expect(out.analyzed).toBe(false);
    expect(out.hint).toContain('director');
  });

  it('no row → admin hint points at the Part Tracks menu', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [] }), role: 'admin' });
    expect(JSON.parse(replyJson).hint).toContain('Part Tracks');
  });

  it('row without analysis (pre-backfill) is still an honest miss', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [scoreRow({ analysis: null })] }), role: 'member' });
    expect(JSON.parse(replyJson).analyzed).toBe(false);
  });

  it('failed analysis reports failure, not facts', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [scoreRow({ analysis: null, status: 'failed', error_message: 'boom' })] }) });
    const out = JSON.parse(replyJson);
    expect(out.analyzed).toBe(false);
    expect(out.failed).toBe(true);
    expect(out.error_message).toBe('boom');
  });

  it('pdf_omr facts come back optical with a caveat note', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [scoreRow()], gw_parttrack_parts: PART_ROWS }) });
    const out = JSON.parse(replyJson);
    expect(out.analyzed).toBe(true);
    expect(out.optical).toBe(true);
    expect(out.optical_note).toContain('optically');
    expect(out.key.initial).toBe('F major');
    expect(out.measures).toBe(84);
    expect(out.duration_ms).toBe(210_000);
    expect(out.warnings).toContain('omr_beta');
  });

  it('parts prefer confirmed DB role/label; excluded staves are flagged', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [scoreRow()], gw_parttrack_parts: PART_ROWS }) });
    const parts = JSON.parse(replyJson).parts;
    expect(parts[0].role).toBe('soprano_1');       // DB row wins over analysis blob
    expect(parts[0].label).toBe('Soprano I');
    expect(parts[0].range).toEqual({ low: 'C4', high: 'G5' });
    expect(parts[0].excluded).toBeUndefined();
    expect(parts[1].excluded).toBe(true);
  });

  it('musicxml source is not optical and tempo override is reported', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({
          gw_parttrack_scores: [scoreRow({ source_type: 'mxl', tempo_override_bpm: 88 })],
          gw_parttrack_parts: PART_ROWS,
        }) });
    const out = JSON.parse(replyJson);
    expect(out.optical).toBe(false);
    expect(out.optical_note).toBeUndefined();
    expect(out.marked_tempo_bpm).toBe(96);
    expect(out.performance_tempo_bpm).toBe(88);
    expect(out.tempo_overridden).toBe(true);
  });

  it('db errors surface as an error field', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [] }, { message: 'permission denied' }) });
    expect(JSON.parse(replyJson).error).toContain('permission denied');
  });
});
