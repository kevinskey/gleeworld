// Shared recipient-group → gw_profiles.role mapping used by every
// composer (Email / SMS / Newsletter / Broadcast). Adding a new
// recipient bucket here means every composer gets it — no per-file
// ternary to keep in sync.

export type ComposerGroup = 'all' | 'students' | 'admins' | 'fans' | 'parents' | 'custom';

/**
 * Return the `gw_profiles.role` value that a given composer group
 * should filter by, or `undefined` when the group is not a single-role
 * filter (`all` = no filter, `custom` = explicit ids).
 */
export function roleForGroup(group: ComposerGroup): string | undefined {
  switch (group) {
    case 'students': return 'student';
    case 'admins':   return 'admin';
    case 'fans':     return 'fan';
    case 'parents':  return 'parent';
    default:         return undefined;
  }
}
