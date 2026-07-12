import { describe, it, expect } from 'vitest';
import { personalScoreUploadPath, validateScoreFile, MAX_SCORE_BYTES, PERSONAL_SCORES_BUCKET } from './personalLibrary';

const pdf = (bytes: number) =>
  new File([new Uint8Array(bytes)], 'score.pdf', { type: 'application/pdf' });

describe('personalScoreUploadPath', () => {
  it('nests under <userId>/uploads/ and always ends .pdf', () => {
    const p = personalScoreUploadPath('user-123', 'My Song (final).PDF');
    expect(p.startsWith('user-123/uploads/')).toBe(true);
    expect(p.endsWith('.pdf')).toBe(true);
    // no user-supplied name fragments leak into the object key
    expect(p).not.toContain('My Song');
  });
  it('generates unique paths per call', () => {
    expect(personalScoreUploadPath('u', 'a.pdf')).not.toBe(personalScoreUploadPath('u', 'a.pdf'));
  });
});

describe('validateScoreFile', () => {
  it('accepts a small pdf', () => {
    expect(validateScoreFile(pdf(1000))).toBeNull();
  });
  it('rejects non-pdf mime', () => {
    const doc = new File([new Uint8Array(10)], 'a.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(validateScoreFile(doc)).toMatch(/pdf/i);
  });
  it('rejects files over the cap', () => {
    const big = pdf(MAX_SCORE_BYTES + 1);
    expect(validateScoreFile(big)).toMatch(/25/);
  });
});

it('exports the bucket name', () => {
  expect(PERSONAL_SCORES_BUCKET).toBe('personal-scores');
});
