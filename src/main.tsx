import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/tenant-theme.css'
import { installAudioUnlock } from './lib/audioTools/unlock'
import { BootErrorBoundary } from './BootErrorBoundary'

// Surface module-level throws / unhandled rejections that fire before React
// can render the BootErrorBoundary — on WKWebView there's no devtools UI for
// the end user, so a white screen with no clue is the worst possible state.
const renderBootError = (label: string, detail: string) => {
  try {
    const el = document.getElementById('root');
    if (el && !el.childElementCount) {
      el.innerHTML =
        '<pre style="padding:16px;font:12px/1.4 -apple-system,monospace;color:#fca5a5;background:#0b1220;min-height:100vh;margin:0;overflow:auto;white-space:pre-wrap;word-break:break-word;">' +
        label + '\n' + detail + '\n\n</pre>' +
        '<div style="position:fixed;left:0;right:0;bottom:0;padding:12px;background:#111827;text-align:center;">' +
          '<button id="__gw_reset__" style="padding:10px 18px;border-radius:8px;background:#2563eb;color:#fff;font:600 14px/1 -apple-system;border:0;cursor:pointer;">Clear storage and reload</button>' +
        '</div>';
      const btn = document.getElementById('__gw_reset__');
      if (btn) btn.addEventListener('click', () => {
        try { localStorage.clear(); } catch { /* ignore */ }
        try { sessionStorage.clear(); } catch { /* ignore */ }
        try {
          if ('caches' in window) {
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
              .finally(() => location.reload());
          } else { location.reload(); }
        } catch { location.reload(); }
      });
    }
  } catch { /* ignore */ }
};
// Serialize whatever the browser handed us into as much detail as we can
// legally read. Cross-origin errors intentionally have a scrubbed message
// (Chrome/Safari show "Script error."); we surface that verbatim so the
// user sees the real distinction between "our code crashed" and "a CDN
// script blew up outside our reach."
const detailOf = (e: ErrorEvent): string => {
  const parts: string[] = [];
  const err = e.error as (Error & { name?: string; stack?: string }) | null;
  if (err?.name) parts.push('name: ' + err.name);
  if (e.message) parts.push('message: ' + e.message);
  if (e.filename) parts.push('file: ' + e.filename + (e.lineno ? ':' + e.lineno + ':' + e.colno : ''));
  if (err?.stack) parts.push('\nstack:\n' + err.stack);
  if (parts.length === 0) {
    // Nothing useful — dump whatever the raw event stringifies to as
    // last resort. Better than "Boot error: error" with nothing else.
    try { parts.push('raw: ' + JSON.stringify(e, Object.getOwnPropertyNames(e))); }
    catch { parts.push('raw: <unserializable>'); }
  }
  return parts.join('\n');
};
const detailOfRejection = (r: unknown): string => {
  const parts: string[] = [];
  if (r && typeof r === 'object') {
    const rr = r as { name?: string; message?: string; stack?: string };
    if (rr.name) parts.push('name: ' + rr.name);
    if (rr.message) parts.push('message: ' + rr.message);
    if (rr.stack) parts.push('\nstack:\n' + rr.stack);
  } else if (r !== undefined) {
    parts.push('value: ' + String(r));
  }
  if (parts.length === 0) parts.push('raw: <no detail>');
  return parts.join('\n');
};
window.addEventListener('error', (e) => {
  renderBootError('Boot error', detailOf(e));
});
window.addEventListener('unhandledrejection', (e) => {
  renderBootError('Unhandled rejection', detailOfRejection(e.reason));
});

installAudioUnlock();

// Capacitor iOS WebView occasionally reports a stale window.innerWidth on
// the very first paint after app launch, which causes our `useIsMobile`
// hooks to render the desktop layout on a phone. Without a window resize
// (e.g. user rotating the device) the layout never recovers. We nudge a
// resize on the next two animation frames + a 250ms timer so any
// breakpoint hook listening for it re-measures against the real viewport.
const nudgeResize = () => window.dispatchEvent(new Event('resize'));
requestAnimationFrame(() => requestAnimationFrame(nudgeResize));
setTimeout(nudgeResize, 250);
window.addEventListener('orientationchange', () => setTimeout(nudgeResize, 50));

// iOS WebView often leaves the page stuck at the zoom level used when it
// auto-zoomed into a focused input — pinch-out doesn't always recover.
// On every focusout, briefly clamp the viewport scale then restore it,
// which forces WKWebView to redraw at zoom = 1.
(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  if (!isIOS) return;
  const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement | null;
  if (!viewport) return;
  const original = viewport.content;
  const clamp = 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover';
  document.addEventListener('focusout', (e) => {
    const t = e.target as HTMLElement | null;
    if (!t || !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
    viewport.content = clamp;
    setTimeout(() => { viewport.content = original; }, 100);
  });
})();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>
  </React.StrictMode>
);
