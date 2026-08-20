// What a drop does to the keycap grid's edit draft.
//
// Lives outside HomeTileGrid because the rules are worth testing without
// simulating a pointer drag in jsdom, which dnd-kit cannot do reliably —
// and because a component file that also exports helpers loses fast refresh.
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Where the dragged tile lands, and — when the drop crossed a heading —
 * which band it now belongs to.
 *
 * `refileTo` is absent (not `null`) when the drop stayed inside one band,
 * because `null` is a real answer there: the loose band, i.e. ungrouped.
 * That is what makes "drag an app out of a group and up to the top"
 * expressible at all.
 */
export interface DropPlan {
  reorder: (order: string[]) => string[];
  refileTo?: string | null;
}

export function planDrop(
  activeKey: string,
  overKey: string,
  bandIdOfKey: Map<string, string | null>,
): DropPlan {
  const target = bandIdOfKey.get(overKey) ?? null;
  const reorder = (order: string[]) => {
    const from = order.indexOf(activeKey);
    const to = order.indexOf(overKey);
    // Either key missing means the draft moved on under the drag (a tile
    // removed mid-gesture); leaving the order untouched is the safe answer.
    return from === -1 || to === -1 ? order : arrayMove(order, from, to);
  };
  return (bandIdOfKey.get(activeKey) ?? null) === target
    ? { reorder }
    : { reorder, refileTo: target };
}
