import { Component, ErrorInfo, ReactNode } from 'react';

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

// Last-ditch error boundary at the root of the app. Without it, any throw
// during initial render white-screens the bundle — on native iOS/iPadOS
// the WKWebView has no devtools surface for the end user, so the only way
// to learn what crashed is to render the error message on screen.
// A lazy route chunk failing to fetch usually means the tab is running a
// bundle from before the latest deploy and the old hashed chunk no longer
// exists on the server. A reload fetches the fresh index.html and fixes it —
// do that once automatically (per-tab guard) instead of showing the crash
// screen; if the retry also fails, the error is real and gets rendered.
const isStaleChunkError = (e: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
    .test(e.message || '');

const reloadOnceForStaleChunk = (): boolean => {
  try {
    if (sessionStorage.getItem('gw-chunk-retried')) return false;
    sessionStorage.setItem('gw-chunk-retried', '1');
    window.location.reload();
    return true;
  } catch {
    return false;
  }
};

export class BootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isStaleChunkError(error) && reloadOnceForStaleChunk()) {
      // Reload is underway — keep rendering children (they're already on
      // screen) rather than flashing the crash UI for the last frame.
      return { error: null };
    }
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (!this.state.error) return; // stale-chunk reload path
    this.setState({ info });
    try {
      console.error('[BootErrorBoundary]', error, info.componentStack);
    } catch { /* ignore */ }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const e = this.state.error;
    const stack = e.stack || String(e);
    const compStack = this.state.info?.componentStack || '';
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0b1220',
        color: '#fff',
        padding: 'max(16px, env(safe-area-inset-top)) 16px 16px 16px',
        font: '13px/1.4 -apple-system, monospace',
        overflow: 'auto',
        zIndex: 999999,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          App crashed at boot
        </div>
        <div style={{ marginBottom: 12, color: '#fca5a5' }}>{e.name}: {e.message}</div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, color: '#cbd5e1' }}>
{stack}
        </pre>
        {compStack && (
          <>
            <div style={{ marginTop: 12, marginBottom: 4, color: '#a5b4fc' }}>Component stack:</div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, color: '#cbd5e1' }}>
{compStack}
            </pre>
          </>
        )}
        <button
          onClick={() => { try { localStorage.clear(); } catch {} window.location.reload(); }}
          style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 8,
            background: '#1d4ed8', color: '#fff', border: 0, fontSize: 14,
          }}
        >
          Clear storage and reload
        </button>
      </div>
    );
  }
}
