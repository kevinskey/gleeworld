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
const renderBootError = (label: string, message: string, stack: string) => {
  try {
    const el = document.getElementById('root');
    if (el && !el.childElementCount) {
      el.innerHTML =
        '<pre style="padding:16px;font:12px/1.4 -apple-system,monospace;color:#fca5a5;background:#0b1220;height:100vh;margin:0;overflow:auto;white-space:pre-wrap;word-break:break-word;">' +
        label + ': ' + message + '\n\n' + stack + '</pre>';
    }
  } catch { /* ignore */ }
};
window.addEventListener('error', (e) => {
  renderBootError('Boot error', String(e.message || ''), String((e.error && e.error.stack) || ''));
});
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason as { message?: string; stack?: string } | undefined;
  renderBootError('Unhandled rejection', String(r?.message || r || ''), String(r?.stack || ''));
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
