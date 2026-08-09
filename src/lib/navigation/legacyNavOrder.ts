// Legacy nav-order parser. The useNavItemOrder hook it belonged to was
// superseded by useMyTools (2026-08-08); this parser survives because
// migrateToMyTools still reads v1-v3 blobs written before that change.
// Delete once no stored preference predates v4.
export interface NavOrder {
  v: 3;
  order: string[];
  sections: Record<string, string>;
  sectionOrder: string[];
}

export function parseNavOrder(raw: unknown): NavOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { v?: unknown; order?: unknown; sections?: unknown; sectionOrder?: unknown };
  const version = candidate.v;
  if (version !== 1 && version !== 2 && version !== 3) return null;
  if (!Array.isArray(candidate.order)) return null;
  const order = candidate.order.filter((k): k is string => typeof k === 'string');
  if (!order.length) return null;
  const sections: Record<string, string> = {};
  if ((version === 2 || version === 3) && candidate.sections && typeof candidate.sections === 'object') {
    for (const [k, v] of Object.entries(candidate.sections as Record<string, unknown>)) {
      if (typeof v === 'string') sections[k] = v;
    }
  }
  const sectionOrder: string[] = [];
  if (version === 3 && Array.isArray(candidate.sectionOrder)) {
    for (const s of candidate.sectionOrder) if (typeof s === 'string') sectionOrder.push(s);
  }
  return { v: 3, order, sections, sectionOrder };
}
