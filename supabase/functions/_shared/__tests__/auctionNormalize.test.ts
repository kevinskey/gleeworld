import { describe, expect, it } from 'vitest';
import {
  NORMALIZATION_SYSTEM_PROMPT,
  buildNormalizationMessages,
  decideReviewStatus,
  estimateCostMicrocents,
  isPeakPricing,
  parseNormalizationResponse,
} from '../auctionNormalize.ts';

const lots = [
  { id: 'a1', raw_title: 'Siemens Magnetom Avanto 1.5T', raw_text: 'Removed from service 2024' },
  { id: 'b2', raw_title: 'GE Lightspeed VCT 64-slice CT', raw_text: null },
];

describe('buildNormalizationMessages', () => {
  it('puts the stable system prompt first, byte-identical every time', () => {
    const a = buildNormalizationMessages(lots);
    const b = buildNormalizationMessages([lots[1]]);
    expect(a[0].role).toBe('system');
    expect(a[0].content).toBe(NORMALIZATION_SYSTEM_PROMPT);
    // Cache hits depend on an exact shared prefix — the system message must
    // not vary with the batch.
    expect(a[0].content).toBe(b[0].content);
  });

  it('sends every lot in one user message, keyed by id', () => {
    const msgs = buildNormalizationMessages(lots);
    expect(msgs).toHaveLength(2);
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toContain('a1');
    expect(msgs[1].content).toContain('b2');
    expect(msgs[1].content).toContain('Magnetom Avanto');
  });

  it('tolerates a null raw_text', () => {
    expect(() => buildNormalizationMessages([lots[1]])).not.toThrow();
  });
});

describe('parseNormalizationResponse', () => {
  const ids = new Set(['a1', 'b2']);

  it('accepts a well-formed response', () => {
    const raw = JSON.stringify({
      lots: [{
        id: 'a1', modality: 'mri', manufacturer: 'Siemens', model: 'Magnetom Avanto',
        year: 2014, serial: null, condition_notes: 'Removed from service', confidence: 0.92,
      }],
    });
    const { valid, invalid } = parseNormalizationResponse(raw, ids);
    expect(invalid).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      id: 'a1', modality: 'mri', manufacturer: 'Siemens', year: 2014, confidence: 0.92,
    });
  });

  it('rejects a response that is not JSON at all', () => {
    const { valid, invalid } = parseNormalizationResponse('I think this is an MRI!', ids);
    expect(valid).toHaveLength(0);
    expect(invalid.length).toBeGreaterThan(0);
  });

  it('rejects a lot id the model invented', () => {
    const raw = JSON.stringify({
      lots: [{ id: 'not-a-real-lot', modality: 'mri', confidence: 0.9 }],
    });
    const { valid, invalid } = parseNormalizationResponse(raw, ids);
    expect(valid).toHaveLength(0);
    expect(invalid[0]).toContain('not-a-real-lot');
  });

  it('rejects a modality outside the known set instead of inventing a column value', () => {
    const raw = JSON.stringify({
      lots: [{ id: 'a1', modality: 'teleporter', confidence: 0.9 }],
    });
    const { valid } = parseNormalizationResponse(raw, ids);
    expect(valid).toHaveLength(0);
  });

  it('rejects an entry with no usable confidence', () => {
    const raw = JSON.stringify({ lots: [{ id: 'a1', modality: 'mri' }] });
    expect(parseNormalizationResponse(raw, ids).valid).toHaveLength(0);
  });

  it('rejects a confidence outside 0..1 rather than clamping a nonsense value', () => {
    const raw = JSON.stringify({ lots: [{ id: 'a1', modality: 'mri', confidence: 7 }] });
    expect(parseNormalizationResponse(raw, ids).valid).toHaveLength(0);
  });

  it('rejects an implausible year', () => {
    const raw = JSON.stringify({
      lots: [{ id: 'a1', modality: 'mri', year: 1492, confidence: 0.9 }],
    });
    expect(parseNormalizationResponse(raw, ids).valid).toHaveLength(0);
  });

  it('accepts nulls for fields the text genuinely does not state', () => {
    const raw = JSON.stringify({
      lots: [{
        id: 'a1', modality: null, manufacturer: null, model: null,
        year: null, serial: null, condition_notes: null, confidence: 0.2,
      }],
    });
    const { valid } = parseNormalizationResponse(raw, ids);
    expect(valid).toHaveLength(1);
    expect(valid[0].modality).toBeNull();
  });

  it('keeps the good entries when only one in a batch is malformed', () => {
    const raw = JSON.stringify({
      lots: [
        { id: 'a1', modality: 'mri', confidence: 0.9 },
        { id: 'b2', modality: 'nonsense', confidence: 0.9 },
      ],
    });
    const { valid, invalid } = parseNormalizationResponse(raw, ids);
    expect(valid.map((v) => v.id)).toEqual(['a1']);
    expect(invalid).toHaveLength(1);
  });

  it('unwraps a JSON object fenced in markdown, which models still emit', () => {
    const raw = '```json\n' + JSON.stringify({
      lots: [{ id: 'a1', modality: 'ct', confidence: 0.8 }],
    }) + '\n```';
    expect(parseNormalizationResponse(raw, ids).valid).toHaveLength(1);
  });
});

describe('decideReviewStatus', () => {
  it('auto-approves a confident extraction', () => {
    expect(decideReviewStatus(0.9, 0.75)).toBe('auto');
  });

  it('sends a shaky extraction to the review queue instead of into search', () => {
    expect(decideReviewStatus(0.4, 0.75)).toBe('needs_review');
  });

  it('treats exactly-at-threshold as good enough', () => {
    expect(decideReviewStatus(0.75, 0.75)).toBe('auto');
  });
});

describe('isPeakPricing', () => {
  // DeepSeek peak hours are 01:00–04:00 and 06:00–10:00 UTC; everything else
  // is off-peak, and the batch job is scheduled to land off-peak.
  it('reports peak inside the two peak windows', () => {
    expect(isPeakPricing(new Date('2026-08-18T01:00:00Z'))).toBe(true);
    expect(isPeakPricing(new Date('2026-08-18T03:59:00Z'))).toBe(true);
    expect(isPeakPricing(new Date('2026-08-18T06:00:00Z'))).toBe(true);
    expect(isPeakPricing(new Date('2026-08-18T09:59:00Z'))).toBe(true);
  });

  it('reports off-peak outside them, including the gap between the windows', () => {
    expect(isPeakPricing(new Date('2026-08-18T00:30:00Z'))).toBe(false);
    expect(isPeakPricing(new Date('2026-08-18T05:00:00Z'))).toBe(false);
    expect(isPeakPricing(new Date('2026-08-18T10:00:00Z'))).toBe(false);
    expect(isPeakPricing(new Date('2026-08-18T12:00:00Z'))).toBe(false);
  });
});

describe('estimateCostMicrocents', () => {
  const usage = { prompt_tokens: 1_000_000, cached_prompt_tokens: 0, completion_tokens: 0 };

  it('prices a million cache-miss input tokens at the off-peak rate', () => {
    // $0.22 per 1M tokens = 22 cents = 22,000,000 microcents.
    expect(estimateCostMicrocents(usage, false)).toBe(22_000_000);
  });

  it('charges double at peak', () => {
    expect(estimateCostMicrocents(usage, true)).toBe(44_000_000);
  });

  it('bills cached input far below fresh input', () => {
    const cached = { prompt_tokens: 1_000_000, cached_prompt_tokens: 1_000_000, completion_tokens: 0 };
    expect(estimateCostMicrocents(cached, false)).toBe(700_000);
  });

  it('prices output tokens highest', () => {
    const out = { prompt_tokens: 0, cached_prompt_tokens: 0, completion_tokens: 1_000_000 };
    expect(estimateCostMicrocents(out, false)).toBe(66_000_000);
  });

  it('returns a whole number for a bigint column', () => {
    const odd = { prompt_tokens: 1234, cached_prompt_tokens: 7, completion_tokens: 89 };
    expect(Number.isInteger(estimateCostMicrocents(odd, false))).toBe(true);
  });
});
