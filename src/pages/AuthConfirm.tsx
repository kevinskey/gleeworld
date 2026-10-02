// /auth/confirm — the tap that spends the token.
//
// Emailed sign-in links land HERE, not on GoTrue's /auth/v1/verify. The
// whole point is that loading this page does nothing: the token is only
// spent inside the click handler. Mail-security scanners (Microsoft Safe
// Links, Proofpoint, Mimecast) fetch the page — one of them completed a
// member's login and took the session on 2026-10-02 — but they do not press
// buttons.
//
// So: NEVER verify in an effect, on mount, on hover, or on a timer. If you
// are tempted to "skip the extra tap", you are re-opening the hole.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MailCheck } from 'lucide-react';
import type { EmailOtpType } from '@supabase/supabase-js';

const VALID_TYPES: EmailOtpType[] = ['magiclink', 'recovery', 'invite', 'signup', 'email_change'];

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenHash = params.get('token_hash');
  const rawType = params.get('type') ?? 'magiclink';
  const type = (VALID_TYPES as string[]).includes(rawType)
    ? (rawType as EmailOtpType)
    : 'magiclink';
  // Workspace members outnumber class invitees, and /academy is empty for
  // anyone not enrolled in a course — so the fallback is the Command Center.
  const next = params.get('next') || '/dashboard';

  async function confirm() {
    if (!tokenHash || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (err || !data.session) {
      // Genuinely expired/spent now — the one case where the old message is
      // the true one.
      setError(err?.message ?? 'That link has already been used or has expired.');
      setBusy(false);
      return;
    }
    // Recovery links exist to set a password; everything else goes where the
    // sender asked.
    navigate(type === 'recovery' ? '/reset-password' : next, { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="text-center max-w-sm space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <MailCheck className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">
          {type === 'recovery' ? 'Reset your password' : 'Welcome to GleeWorld'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tokenHash
            ? 'Tap below to finish signing in. This link works once.'
            : 'This link is missing its sign-in code. Please ask for a new one.'}
        </p>

        {tokenHash && (
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="w-full px-4 py-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Signing you in…' : (type === 'recovery' ? 'Continue' : 'Sign me in')}
          </button>
        )}

        {error && (
          <div className="space-y-2">
            <p className="text-sm text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/auth', { replace: true })}
              className="text-sm underline text-muted-foreground hover:text-foreground"
            >
              Go to sign-in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
