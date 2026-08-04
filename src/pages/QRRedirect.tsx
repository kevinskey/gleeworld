// /q/:token — the far end of a tracked QR code.
//
// Logs the scan, then sends the visitor on. This is a client-side hop rather
// than an nginx 302 because a server redirect would need a location block on
// every tenant vhost; the same trade-off the app already makes for
// /event-checkin/:token and /attendance-scan.
//
// It must degrade well: somebody is standing in a lobby holding a phone. Every
// failure path says what happened in plain words instead of a blank screen.

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, QrCode, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type State =
  | { kind: 'loading' }
  | { kind: 'redirecting'; url: string; title: string }
  | { kind: 'error'; message: string };

const MESSAGES: Record<string, string> = {
  not_found: "This code isn't active any more.",
  expired: 'This code has expired.',
  limit_reached: 'This code has reached its scan limit.',
  bad_destination: "This code points somewhere we can't open.",
};

export default function QRRedirectPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  // One resolve per token, ever. The effect can run twice for a single visit
  // (StrictMode's double-invoke, a remount, a re-render before navigation
  // completes) and each run is a counted scan — which would quietly inflate
  // exactly the number this feature exists to report. `cancelled` is not
  // enough: it stops the setState, not the request that already went out.
  const resolvedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (resolvedFor.current === token) return;
    resolvedFor.current = token ?? null;

    (async () => {
      const { data, error } = await supabase.rpc('gw_qr_resolve_scan', {
        p_token: token ?? '',
        p_user_agent: navigator.userAgent,
        p_referrer: document.referrer || null,
      });
      if (cancelled) return;

      if (error) {
        setState({ kind: 'error', message: "We couldn't look this code up. Check your connection and try again." });
        return;
      }
      const res = data as { ok?: boolean; url?: string; title?: string; error?: string } | null;
      if (!res?.ok || !res.url) {
        setState({ kind: 'error', message: MESSAGES[res?.error ?? ''] ?? "This code isn't active any more." });
        return;
      }
      // Belt and braces: the RPC already refuses anything that isn't http(s),
      // but this is the line that actually navigates, so it re-checks.
      if (!/^https?:\/\//i.test(res.url)) {
        setState({ kind: 'error', message: MESSAGES.bad_destination });
        return;
      }
      setState({ kind: 'redirecting', url: res.url, title: res.title ?? '' });
      window.location.replace(res.url);
    })();

    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="text-center max-w-sm">
        {state.kind === 'error' ? (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-4 font-semibold">{state.message}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask whoever shared it for an up-to-date link.
            </p>
          </>
        ) : (
          <>
            <QrCode className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Taking you there…
            </p>
            {state.kind === 'redirecting' && (
              // If replace() is blocked or slow, give them something to tap.
              <a href={state.url} className="mt-4 inline-block text-sm underline">
                Continue to {state.title || 'the page'}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
