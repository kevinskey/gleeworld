import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PartnerInviteRedeem() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking'|'need-signin'|'redeeming'|'error'>('checking');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('need-signin'); return; }
      setStatus('redeeming');
      try {
        const { data, error } = await supabase.functions.invoke<{ partner_id: string; error?: string }>(
          'partner-invite-redeem', { body: { token } }
        );
        if (error || !data || data.error) {
          const msg = data?.error ?? error?.message ?? 'redeem failed';
          setMessage(msg); setStatus('error'); return;
        }
        toast.success('Welcome to the GleeWorld composer store');
        navigate('/partner?welcome=1');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e)); setStatus('error');
      }
    })();
  }, [token, navigate]);

  return (
    <DashboardPageShell title="Composer store invite">
      {status === 'checking' && <p className="text-sm text-muted-foreground">Checking your invite…</p>}
      {status === 'redeeming' && <p className="text-sm text-muted-foreground">Setting up your partner account…</p>}
      {status === 'need-signin' && (
        <div className="space-y-3">
          <p className="text-sm">Sign in with the email address that received the invite to continue.</p>
          <Button onClick={() => navigate(`/login?next=${encodeURIComponent(`/partner/invite/${token}`)}`)}>Sign in</Button>
        </div>
      )}
      {status === 'error' && (
        <div className="space-y-3">
          <p className="text-sm text-destructive">Couldn't redeem: {message}</p>
          <p className="text-xs text-muted-foreground">Ask Kevin to send a fresh invite.</p>
        </div>
      )}
    </DashboardPageShell>
  );
}
