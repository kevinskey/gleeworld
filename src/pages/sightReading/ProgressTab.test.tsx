// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProgressTab, readTakes } from './ProgressTab';

const KEY = 'gw_sight_reading_activity';

// Mirrors the shape SingFlow.logOnce writes.
const entry = (overall: number, level: number, key: string, ts: number) => ({
  ts,
  kind: 'practiced',
  label: `${key} major · level ${level} · ${overall}/100`,
  meta: { overall, level, key },
});

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('readTakes', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(readTakes(KEY)).toEqual([]);
  });

  it('ignores malformed blobs instead of throwing', () => {
    localStorage.setItem(KEY, 'not json');
    expect(readTakes(KEY)).toEqual([]);
    localStorage.setItem(KEY, JSON.stringify({ not: 'an array' }));
    expect(readTakes(KEY)).toEqual([]);
  });

  it('keeps only well-formed practiced entries and flattens meta', () => {
    localStorage.setItem(KEY, JSON.stringify([
      entry(87, 2, 'C', 1000),
      { ts: 2000, kind: 'practiced', meta: { level: 3 } }, // no overall → dropped
      { ts: 3000, kind: 'other', meta: { overall: 50 } },  // wrong kind → dropped
    ]));
    const takes = readTakes(KEY);
    expect(takes).toHaveLength(1);
    expect(takes[0]).toEqual({ ts: 1000, overall: 87, level: 2, musicKey: 'C' });
  });
});

describe('ProgressTab', () => {
  it('shows the empty state when there are no takes', () => {
    render(<ProgressTab activityKey={KEY} />);
    expect(screen.getByText(/No takes yet/i)).toBeInTheDocument();
  });

  it('shows takes count, best, average, and a row per take', () => {
    localStorage.setItem(KEY, JSON.stringify([
      entry(90, 2, 'C', 3000),
      entry(80, 2, 'C', 2000),
      entry(70, 1, 'G', 1000),
    ]));
    render(<ProgressTab activityKey={KEY} />);
    // Summary labels + the unique takes count (3). Best (90) and average (80)
    // each also appear as a take-row score, so assert they render at all.
    expect(screen.getByText('Takes')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();          // takes count (unique)
    expect(screen.getAllByText('90').length).toBeGreaterThan(0); // best
    expect(screen.getAllByText('80').length).toBeGreaterThan(0); // average
    // A row for each take's key/level label.
    expect(screen.getAllByText(/Level 2/).length).toBe(2);
    expect(screen.getByText(/G · Level 1/)).toBeInTheDocument();
  });
});
