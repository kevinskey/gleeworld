// /auth/callback — landing page for magic links. Reads the session, decides
// where the user actually belongs (profile setup if new, target page if known).
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      // Magic links land here with the session already established by Supabase Auth.
      // Wait briefly for the session to settle, then route.
      let session = null;
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) { session = data.session; break; }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (cancelled) return;
      if (!session) {
        setMsg('Sign-in link expired or invalid.');
        setTimeout(() => navigate('/auth', { replace: true }), 2000);
        return;
      }

      const next = params.get('next') || '/academy';

      // If there's no profile or full_name is missing → onboarding first.
      const userId = session.user.id;
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('full_name, voice_part, role')
        .eq('user_id', userId)
        .maybeSingle();

      const needsOnboarding = !profile || !profile.full_name;
      if (needsOnboarding) {
        navigate(`/onboarding?next=${encodeURIComponent(next)}`, { replace: true });
      } else {
        navigate(next, { replace: true });
      }
    }
    run();
    return () => { cancelled = true; };
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    </div>
  );
}
