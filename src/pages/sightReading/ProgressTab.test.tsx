// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProgressTab } from './ProgressTab';
import type { Take } from '@/lib/sightReading/takesApi';

const KEY = 'gw_sight_reading_activity';
const entry = (overall: number, level: number, key: string, ts: number) => ({
  ts, kind: 'practiced', label: `${key} · ${overall}`, meta: { overall, level, key },
});
const noRemote = () => Promise.resolve(null);

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('ProgressTab', () => {
  it('shows the empty state when there are no takes', () => {
    render(<ProgressTab activityKey={KEY} loadRemote={noRemote} />);
    expect(screen.getByText(/No takes yet/i)).toBeInTheDocument();
  });

  it('renders the local log (summary + rows) when the server is unavailable', () => {
    localStorage.setItem(KEY, JSON.stringify([
      entry(90, 2, 'C', 3000),
      entry(80, 2, 'C', 2000),
      entry(70, 1, 'G', 1000),
    ]));
    render(<ProgressTab activityKey={KEY} loadRemote={noRemote} />);
    expect(screen.getByText('3')).toBeInTheDocument();            // takes count
    expect(screen.getAllByText('90').length).toBeGreaterThan(0);  // best
    expect(screen.getAllByText(/Level 2/).length).toBe(2);
    expect(screen.getByText(/G · Level 1/)).toBeInTheDocument();
    expect(screen.getByText('Saved on this device.')).toBeInTheDocument();
  });

  it('keeps the local stats when the server has no takes yet (no blink-off)', async () => {
    localStorage.setItem(KEY, JSON.stringify([entry(88, 2, 'C', 1000)]));
    let resolveRemote!: (v: Take[] | null) => void;
    const gate = new Promise<Take[] | null>((r) => { resolveRemote = r; });
    render(<ProgressTab activityKey={KEY} loadRemote={() => gate} />);
    // Local stats are on screen before the server responds.
    expect(screen.getByText('Saved on this device.')).toBeInTheDocument();
    // Server resolves empty — the stats must NOT be wiped to the empty state.
    resolveRemote([]);
    await Promise.resolve();
    expect(screen.queryByText(/No takes yet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/C · Level 2/)).toBeInTheDocument();
    expect(screen.getByText('Saved on this device.')).toBeInTheDocument();
  });

  it('replaces the local log with server takes and marks it synced', async () => {
    localStorage.setItem(KEY, JSON.stringify([entry(60, 1, 'C', 1000)]));
    const remote: Take[] = [{ ts: 5000, overall: 95, level: 4, musicKey: 'D' }];
    render(<ProgressTab activityKey={KEY} loadRemote={() => Promise.resolve(remote)} />);
    // Server history wins once it loads: the D/Level-4 row appears, the local
    // 60 is gone, and the footnote flips to synced.
    await screen.findByText(/D · Level 4/);
    expect(screen.getByText('Synced to your account.')).toBeInTheDocument();
    expect(screen.queryByText(/C · Level 1/)).not.toBeInTheDocument();
  });
});
