import { describe, it, expect } from 'vitest';
import { findRoutingCycle, formatCycle } from '../routingGraph';
import { MASTER_BUS_ID } from '../session';

describe('findRoutingCycle', () => {
  it('returns ok for an empty graph', () => {
    expect(findRoutingCycle([])).toEqual({ ok: true });
  });

  it('returns ok for a single edge into master', () => {
    expect(findRoutingCycle([{ from: 'bus1', to: MASTER_BUS_ID }])).toEqual({ ok: true });
  });

  it('returns ok for a linear chain', () => {
    // bus1 → bus2 → bus3 → master
    const r = findRoutingCycle([
      { from: 'bus1', to: 'bus2' },
      { from: 'bus2', to: 'bus3' },
      { from: 'bus3', to: MASTER_BUS_ID },
    ]);
    expect(r).toEqual({ ok: true });
  });

  it('returns ok when two branches merge into master', () => {
    // bus1 → master, bus2 → master (fan-in is fine)
    expect(findRoutingCycle([
      { from: 'bus1', to: MASTER_BUS_ID },
      { from: 'bus2', to: MASTER_BUS_ID },
    ])).toEqual({ ok: true });
  });

  it('returns ok when a bus fans out to two downstream buses', () => {
    // Not currently a supported topology (each bus has one output) but the
    // helper is agnostic — its job is cycle detection, not policy.
    expect(findRoutingCycle([
      { from: 'bus1', to: 'bus2' },
      { from: 'bus1', to: 'bus3' },
      { from: 'bus2', to: MASTER_BUS_ID },
      { from: 'bus3', to: MASTER_BUS_ID },
    ])).toEqual({ ok: true });
  });

  it('detects a direct self-loop', () => {
    const r = findRoutingCycle([{ from: 'bus1', to: 'bus1' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.cycle).toEqual(['bus1', 'bus1']);
  });

  it('detects a two-node cycle', () => {
    const r = findRoutingCycle([
      { from: 'bus1', to: 'bus2' },
      { from: 'bus2', to: 'bus1' },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.cycle).toEqual(['bus1', 'bus2', 'bus1']);
  });

  it('detects a three-node cycle (bus1 → bus2 → bus3 → bus1)', () => {
    const r = findRoutingCycle([
      { from: 'bus1', to: 'bus2' },
      { from: 'bus2', to: 'bus3' },
      { from: 'bus3', to: 'bus1' },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.cycle[0]).toBe(r.cycle[r.cycle.length - 1]);
      expect(new Set(r.cycle).size).toBe(3); // three distinct nodes involved
    }
  });

  it('detects a cycle even when the graph also has legal linear branches', () => {
    // legal: bus4 → master
    // cycle: bus1 → bus2 → bus1
    const r = findRoutingCycle([
      { from: 'bus4', to: MASTER_BUS_ID },
      { from: 'bus1', to: 'bus2' },
      { from: 'bus2', to: 'bus1' },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.cycle).toEqual(['bus1', 'bus2', 'bus1']);
  });

  it('ignores an outbound edge from master (master is a terminal sink)', () => {
    // Somebody constructed a synthetic edge from master — helper must
    // treat master as if it has no outbound edges, so no cycle here.
    expect(findRoutingCycle([
      { from: 'bus1', to: MASTER_BUS_ID },
      { from: MASTER_BUS_ID, to: 'bus1' },
    ])).toEqual({ ok: true });
  });

  it('formatCycle renders the arrow-joined path a UI can show verbatim', () => {
    expect(formatCycle(['bus1', 'bus2', 'bus1'])).toBe('bus1 → bus2 → bus1');
  });
});
