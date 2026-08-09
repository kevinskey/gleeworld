// Shared tour types. The engine is intentionally action-agnostic: each
// step's onActivate is a closure the script builder constructs, so the
// sandbox can pass setPanel/setPerspective and the real product can pass
// navigate().

export interface TourStep {
  id: string;
  /** CSS selector resolved against the document at step entry. */
  targetSelector?: string;
  title?: string;
  description: string;
  /** How long the description bubble lingers after the cursor arrives. */
  dwellMs?: number;
  /** Fires after the cursor click pulse. Engine never invokes element.click(). */
  onActivate?: () => void;
  /**
   * Fires immediately before the engine measures `targetSelector` — on
   * step-entry and again on the post-arrival remeasure. For a target that's
   * conditionally unmounted (e.g. behind a disclosure that only renders its
   * contents when open), this is where a script reveals it so the engine
   * finds a real rect instead of treating the step as target-less and
   * skipping straight past the click pulse (which is when onActivate
   * fires). The engine itself still never touches the DOM here — this is a
   * closure the script builder provides, same contract as onActivate.
   *
   * Do NOT assume the reveal is visible in the DOM the instant this
   * returns. `beforeMeasure` is called from inside a React passive-effect
   * commit, where `flushSync` is a documented no-op (plus a console
   * warning), not a real synchronous flush — so a state update triggered
   * here (e.g. `element.click()` on a toggle wired to `useState`) commits
   * on its own schedule. The engine accounts for this itself: if the very
   * next measurement comes up empty, it retries once after a
   * requestAnimationFrame before concluding the step has no target. A
   * `beforeMeasure` implementation just needs to trigger the reveal; it
   * does not need to force it synchronous.
   */
  beforeMeasure?: () => void;
  /**
   * Fires when the step ends — the engine advances past it, or unmounts.
   * The mirror of `beforeMeasure`: whatever a step revealed to be measured
   * (the All Tools sheet is the real case) is put back here, so a modal
   * opened for one step's target does not sit over the page for the rest of
   * that step and through the next step's cursor travel.
   *
   * Same contract as the other two hooks: the engine never touches the DOM
   * itself, and — as with `beforeMeasure` — a state update triggered here
   * commits on React's own schedule, not synchronously. The next step's
   * `beforeMeasure` therefore runs while this one's teardown is still
   * uncommitted; see ensureAllToolsOpen for how that is handled.
   */
  onStepEnd?: () => void;
}
