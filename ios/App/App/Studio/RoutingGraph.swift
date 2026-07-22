// RoutingGraph — Swift mirror of src/lib/studio/routingGraph.ts.
//
// Same algorithm, same contract, ported verbatim so the iOS and web
// engines reject the same cyclic bus edits and format cycles the
// same way in error messages.
//
// This file is INTENTIONALLY dependency-free (no Foundation-heavy
// types beyond what the standard library exports) so it can be
// standalone-verified with `swiftc -parse` without pulling the whole
// audio-engine graph.

/// One directed edge in the bus routing graph: `from` (a bus id or,
/// once sends land, a track id) points at `to` (a bus id, potentially
/// MASTER_BUS_ID).
public struct RoutingEdge: Equatable, Sendable {
    public let from: String
    public let to: String

    public init(from: String, to: String) {
        self.from = from
        self.to = to
    }
}

/// Result of a cycle check. On failure `cycle` holds the offending
/// path with the start node repeated at the end so it can be
/// formatted as `a → b → c → a` for the user.
public enum CycleResult: Equatable, Sendable {
    case ok
    case cycle([String])

    public var isOk: Bool {
        if case .ok = self { return true }
        return false
    }
}

/// DFS with white/gray/black coloring. Master is treated as a
/// terminal sink — outbound edges from master are ignored on
/// principle (master doesn't route anywhere).
///
/// - Parameter edges: the current + proposed edges in the graph.
/// - Returns: `.ok` when the graph is a DAG, or `.cycle([...])`
///   with the offending path.
public func findRoutingCycle(_ edges: [RoutingEdge]) -> CycleResult {
    // Adjacency map — drop outbound edges from master by convention.
    var adjacency: [String: [String]] = [:]
    for edge in edges where edge.from != Studio.masterBusId {
        adjacency[edge.from, default: []].append(edge.to)
    }

    // Node set (for iteration order).
    var nodes = Set<String>()
    for edge in edges {
        nodes.insert(edge.from)
        nodes.insert(edge.to)
    }

    let white = 0, gray = 1, black = 2
    var color: [String: Int] = [:]
    var parent: [String: String] = [:]

    for start in nodes {
        if (color[start] ?? white) != white { continue }
        // Iterative DFS with per-node neighbor-iteration cursor —
        // matches the JS implementation to avoid stack overflow on
        // pathological graphs.
        var stack: [(node: String, iter: Int)] = [(start, 0)]
        color[start] = gray
        while let top = stack.last {
            let neighbors = adjacency[top.node] ?? []
            if top.iter >= neighbors.count {
                color[top.node] = black
                stack.removeLast()
                continue
            }
            stack[stack.count - 1].iter += 1
            let next = neighbors[top.iter]
            let c = color[next] ?? white
            if c == gray {
                // Reconstruct cycle: walk back from `top.node` via
                // parent pointers until we return to `next`, then
                // append `next` to close it.
                var cycle: [String] = [next]
                var cur: String? = top.node
                while let node = cur, node != next {
                    cycle.append(node)
                    cur = parent[node]
                }
                cycle.append(next)
                return .cycle(cycle.reversed())
            }
            if c == white {
                parent[next] = top.node
                color[next] = gray
                stack.append((next, 0))
            }
        }
    }

    return .ok
}

/// Substitute the source's OLD outbound edge with the proposed new
/// one, then run findRoutingCycle. Callers use this to pre-check
/// a bus-output rewire before committing to it.
public func wouldEditCycle(
    existingEdges: [RoutingEdge],
    edit: RoutingEdge,
) -> CycleResult {
    let merged = existingEdges.filter { $0.from != edit.from } + [edit]
    return findRoutingCycle(merged)
}

/// Format a cycle for a user-facing error message. Matches the JS
/// `formatCycle` output byte-for-byte.
public func formatCycle(_ cycle: [String]) -> String {
    return cycle.joined(separator: " → ")
}
