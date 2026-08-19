import { describe, it, expect } from 'vitest';
import { findRoutingCycle, formatCycle, wouldEditCycle } from '../routingGraph';
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
    if (r.ok === false) expect(r.cycle).toEqual(['bus1', 'bus1']);
  });

  it('detects a two-node cycle', () => {
    const r = findRoutingCycle([
      { from: 'bus1', to: 'bus2' },
      { from: 'bus2', to: 'bus1' },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.cycle).toEqual(['bus1', 'bus2', 'bus1']);
  });

  it('detects a three-node cycle (bus1 → bus2 → bus3 → bus1)', () => {
    const r = findRoutingCycle([
      { from: 'bus1', to: 'bus2' },
      { from: 'bus2', to: 'bus3' },
      { from: 'bus3', to: 'bus1' },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
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
    if (r.ok === false) expect(r.cycle).toEqual(['bus1', 'bus2', 'bus1']);
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

describe('wouldEditCycle', () => {
  it('replaces the source outbound edge and returns ok when the result is acyclic', () => {
    const edges = [
      { from: 'bus1', to: MASTER_BUS_ID },
      { from: 'bus2', to: 'bus1' },
    ];
    // Retarget bus1 from master → bus3 (which points at master); still a DAG.
    const r = wouldEditCycle(
      [...edges, { from: 'bus3', to: MASTER_BUS_ID }],
      { from: 'bus1', to: 'bus3' },
    );
    expect(r).toEqual({ ok: true });
  });

  it('rejects an edit that closes a two-node cycle', () => {
    // Existing: bus2 → bus1. Editing bus1 → bus2 closes the loop.
    // Cycle starting node depends on DFS order; assert the set of
    // participants + that the reported path closes on itself.
    const r = wouldEditCycle(
      [{ from: 'bus2', to: 'bus1' }],
      { from: 'bus1', to: 'bus2' },
    );
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.cycle[0]).toBe(r.cycle[r.cycle.length - 1]);
      expect(new Set(r.cycle)).toEqual(new Set(['bus1', 'bus2']));
    }
  });

  it('rejects a direct self-loop edit', () => {
    const r = wouldEditCycle([], { from: 'bus1', to: 'bus1' });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.cycle).toEqual(['bus1', 'bus1']);
  });

  it('allows the edit even when the CURRENT graph is cyclic, so long as the edit breaks it', () => {
    // Current graph is a1 → a2 → a1 (bad). Editing a1 → master fixes it.
    const r = wouldEditCycle(
      [{ from: 'a1', to: 'a2' }, { from: 'a2', to: 'a1' }],
      { from: 'a1', to: MASTER_BUS_ID },
    );
    expect(r).toEqual({ ok: true });
  });
});
