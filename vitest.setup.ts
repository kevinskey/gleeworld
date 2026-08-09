// Provide a minimal Deno global shim so that edge-function files (which use
// Deno.env.get) can be imported by Vitest without modification. The shim
// delegates to process.env so tests can set env vars the normal Node way.

if (typeof globalThis.Deno === 'undefined') {
  (globalThis as any).Deno = {
    env: {
      get: (key: string): string | undefined => process.env[key],
    },
  };
}

// VexFlow 5 sizes every glyph through canvas measureText (Element.measureText),
// which jsdom does not implement: without a stub, mounting any notation surface
// (NotationView, RhythmStrip, ClapBlastStage) floods the run with "Not
// implemented: HTMLCanvasElement.prototype.getContext" and every glyph reports
// width 0, so stems and beams land on top of their note heads. This gives back
// plausible metrics — roughly the proportions of the Bravura glyphs VexFlow
// actually draws — so layout math in tests stays in the right ballpark. It is a
// measurement shim only; nothing here draws.
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof HTMLCanvasElement !== 'undefined' && !(HTMLCanvasElement.prototype as any).__gwMeasureShim) {
  const noop = () => undefined;
  HTMLCanvasElement.prototype.getContext = function getContext(kind: string) {
    if (kind !== '2d') return null;
    let font = '10px sans-serif';
    const sizeOf = () => parseFloat(/(\d+(?:\.\d+)?)p[xt]/.exec(font)?.[1] ?? '10') || 10;
    return {
      get font() { return font; },
      set font(v: string) { font = v; },
      measureText: (text: string) => {
        const em = sizeOf();
        return {
          width: text.length * em * 0.6,
          actualBoundingBoxAscent: em * 0.75,
          actualBoundingBoxDescent: em * 0.25,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: text.length * em * 0.6,
        };
      },
      save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
      fill: noop, stroke: noop, fillText: noop, strokeText: noop, fillRect: noop, clearRect: noop,
      scale: noop, translate: noop, rotate: noop, setTransform: noop, arc: noop,
      bezierCurveTo: noop, quadraticCurveTo: noop, rect: noop, setLineDash: noop,
    } as unknown as CanvasRenderingContext2D;
  } as typeof HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as any).__gwMeasureShim = true;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// A global ResizeObserver/scrollIntoView polyfill was tried here and
// reverted (see AllToolsSheet.test.tsx, which stubs both locally instead).
// jsdom genuinely lacks both, and cmdk needs them at mount — but several
// components elsewhere feature-detect one or the other specifically
// BECAUSE jsdom lacks them (AutomationPanel.tsx, NotationView.tsx,
// TourEngine.tsx all read `typeof ResizeObserver`/`typeof el.scrollIntoView`
// to skip a jsdom-only-unsafe branch), and a handful of others construct a
// ResizeObserver unconditionally, relying on jsdom's absence never coming
// up in their own tests. A global stub flips every one of those guards to
// the "real browser" branch while still doing nothing — TourEngine.tsx's
// scroll-then-measure-synchronously invariant in particular would silently
// stop holding. Scope any future ResizeObserver/scrollIntoView stub to the
// specific suite that needs it.
