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

// jsdom (used per-file via `@vitest-environment jsdom`) does not implement
// ResizeObserver. cmdk's CommandList observes its own height on mount to
// drive a `--cmdk-list-height` CSS var — with no polyfill, mounting any
// Command-based UI (AllToolsSheet, GlobalCommandPalette) throws
// "ResizeObserver is not defined" from inside a passive effect, which
// React surfaces as an unhandled render error rather than a useful test
// failure. This is a layout measurement only; nothing here needs real
// sizes in tests, so the observe/unobserve calls are no-ops.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}

// jsdom also does not implement Element.scrollIntoView — cmdk calls it on
// the selected item whenever the selection moves (mount, filter, keyboard
// nav). Same rationale as the ResizeObserver stub above: a no-op is enough
// since tests never assert on scroll position.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
