// Cycle detection for the mixer routing graph.
//
// The mixer forms a DAG: tracks output to buses, buses output to buses
// or master, sends read from tracks (or buses, later) and inject into
// buses. If a user ever routes bus A → bus B → bus A, the audio graph
// tries to feed itself and either goes silent or feeds back — either
// way the engine should refuse the edit and surface a clean error to
// the UI instead of half-committing.
//
// Deliberately Tone-free / native-free — same helper used by the web
// engine (engine.ts) AND ported verbatim to Swift (Phase 4). Its
// contract is entirely on the adjacency graph.
//
// Master is treated as a terminal sink: edges INTO master are always
// legal, edges OUT of master don't exist by construction (master has
// no `output` field). If a caller passes an edge whose source is
// MASTER_BUS_ID, that's ignored on principle — master doesn't route.

import { MASTER_BUS_ID } from './session';

export type RoutingEdge = {
  /** Bus id (or a track id when we introduce sends in Phase 4). */
  from: string;
  /** Bus id — MASTER_BUS_ID or a user bus id. */
  to: string;
};

export type CycleResult =
  | { ok: true }
  | { ok: false; cycle: string[] };

/** DFS with white/gray/black coloring. Returns the offending cycle
 * path (from → ... → from) on failure so the caller can surface it
 * verbatim to the user. */
export function findRoutingCycle(edges: RoutingEdge[]): CycleResult {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (e.from === MASTER_BUS_ID) continue; // master has no outgoing edges
    const list = adj.get(e.from) ?? [];
    list.push(e.to);
    adj.set(e.from, list);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string>();

  const nodes = new Set<string>();
  for (const e of edges) { nodes.add(e.from); nodes.add(e.to); }

  for (const start of nodes) {
    if ((color.get(start) ?? WHITE) !== WHITE) continue;
    // Iterative DFS to avoid stack overflow on pathological graphs.
    const stack: Array<{ node: string; iter: number }> = [{ node: start, iter: 0 }];
    color.set(start, GRAY);
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const neighbors = adj.get(top.node) ?? [];
      if (top.iter >= neighbors.length) {
        color.set(top.node, BLACK);
        stack.pop();
        continue;
      }
      const next = neighbors[top.iter++];
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        // Reconstruct cycle from parent chain: walk back from `top.node`
        // until we return to `next`, then append `next` to close it.
        const cycle: string[] = [next];
        let cur: string | undefined = top.node;
        while (cur !== undefined && cur !== next) {
          cycle.push(cur);
          cur = parent.get(cur);
        }
        cycle.push(next);
        cycle.reverse();
        return { ok: false, cycle };
      }
      if (c === WHITE) {
        parent.set(next, top.node);
        color.set(next, GRAY);
        stack.push({ node: next, iter: 0 });
      }
    }
  }

  return { ok: true };
}

/** Format a cycle for a user-facing error message. */
export function formatCycle(cycle: string[]): string {
  return cycle.join(' → ');
}
