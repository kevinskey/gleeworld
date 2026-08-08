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
   * closure the script builder provides, same contract as onActivate. Runs
   * synchronously: an implementation that flips React state must flush it
   * (e.g. via `flushSync`) so the DOM already reflects the change by the
   * time this returns.
   */
  beforeMeasure?: () => void;
}
