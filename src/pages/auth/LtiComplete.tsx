// Landing page after the LTI launch flow.
//
// By the time the browser hits this route, the Supabase magic-link
// (issued by the lti-launch edge function) has already exchanged itself
// into a session cookie. We just need to wait for the AuthContext to
// pick that up and then route to /dashboard.
//
// If the session never lands within a few seconds, something went sideways
// — we surface a manual sign-in link and an error code rather than spin
// forever.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LtiComplete() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    // 8s is generous: magic-link redirect → Supabase auth → cookie set →
    // AuthContext rehydrate normally takes well under a second.
    const t = window.setTimeout(() => setStuck(true), 8000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        {!stuck ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-lg font-semibold mb-1">Signing you in via Canvas…</h1>
            <p className="text-sm text-muted-foreground">
              Hang tight — you'll land on your dashboard in a moment.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-2">Sign-in didn't complete</h1>
            <p className="text-sm text-muted-foreground mb-4">
              The Canvas hand-off took longer than expected. Try opening
              GleeWorld directly and signing in with the same email.
            </p>
            <a
              href="/auth"
              className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-primary"
            >
              Sign in manually
            </a>
          </>
        )}
      </div>
    </div>
  );
}
