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
}
