/** Reconciles piano-roll note selection (indices into clip.notes) against
 * a notes array that just changed identity.
 *
 * Two cases collapse into one call site (see PianoRollPanel's reconcile
 * effect):
 *  - External change (undo, collaborator refresh) swapped clip.notes out
 *    from under the panel — the old indices may point at entirely
 *    different notes now, so the only safe move is to clear selection.
 *  - Internal change (this panel's own editClip — quantize, transpose,
 *    delete, add) already set an explicit selection right after the
 *    edit; here we just clamp any indices that fell out of range (e.g. a
 *    multi-delete that shrank the array) and keep everything still valid.
 */
export function reconcileSelection(
  selection: number[],
  notesLength: number,
  notesChangedExternally: boolean,
): number[] {
  if (notesChangedExternally) return [];
  return selection.filter((i) => i < notesLength);
}
