// Sign-in modal: opens over whatever page the visitor was on, so a member
// signing in from the public site doesn't lose their place. The full /auth
// page still exists for direct deep links — this is just the in-context UX.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { pickDestination } from '@/hooks/useRoleBasedRedirect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, KeyRound, Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback when sign-in/sign-up completes successfully. */
  onAuthenticated?: () => void;
  /** Brand primary color, used to tint the submit button. */
  primaryColor?: string;
  /** Foreground that pairs with primaryColor (auto-contrast). */
  primaryForeground?: string;
}

export function SignInDialog({ open, onOpenChange, onAuthenticated, primaryColor, primaryForeground }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Reset transient state whenever the dialog reopens.
  useEffect(() => {
    if (!open) return;
    setResetSent(false);
  }, [open]);

  const btnStyle = primaryColor
    ? { background: primaryColor, color: primaryForeground || '#ffffff' }
    : undefined;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: session, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: 'Welcome back!' });
      onOpenChange(false);
      // Route the newly-signed-in user to their role's destination so they
      // don't sit on the public page wondering where the admin lives. Look
      // up the profile by the freshly-returned user_id and use pickDestination,
      // same logic the global useRoleBasedRedirect would apply.
      const uid = session?.user?.id;
      if (uid) {
        const { data: prof } = await supabase
          .from('gw_profiles')
          .select('role, is_admin, is_super_admin')
          .eq('user_id', uid)
          .maybeSingle();
        const dest = prof ? pickDestination(prof as any) : null;
        if (dest) navigate(dest);
      }
      onAuthenticated?.();
    } catch (err: any) {
      toast({ title: 'Sign in failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/audition-application`,
          data: { full_name: name, tenant_slug: getTenantSlug() },
        },
      });
      if (error) throw error;
      if (data.user && !data.user.email_confirmed_at) {
        toast({ title: 'Check your email', description: 'We sent you a confirmation link.' });
      } else {
        toast({ title: 'Account created!' });
      }
      onOpenChange(false);
      onAuthenticated?.();
    } catch (err: any) {
      toast({ title: 'Sign up failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send reset email.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override the default dialog top offset (which sits at 10% on mobile)
          so the sign-in window is fully centered vertically + horizontally. */}
      <DialogContent className="max-w-md sm:max-w-md !top-1/2 !-translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'login' && (<><LogIn className="w-5 h-5" /> Sign in</>)}
            {mode === 'signup' && (<><UserPlus className="w-5 h-5" /> Create account</>)}
            {mode === 'forgot' && (<><KeyRound className="w-5 h-5" /> Reset password</>)}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login' && 'Sign in to access your account.'}
            {mode === 'signup' && 'Join with your name and email to get started.'}
            {mode === 'forgot' && 'Enter your email to receive a reset link.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'forgot' && resetSent ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: (primaryColor || '#0f172a') + '22' }}>
              <KeyRound className="w-6 h-6" style={{ color: primaryColor || '#0f172a' }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to <strong>{email}</strong>.
              </p>
            </div>
            <Button onClick={() => { setMode('login'); setResetSent(false); }} className="w-full" style={btnStyle}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form
            onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot}
            className="space-y-3"
          >
            {mode === 'signup' && (
              <div className="space-y-1">
                <Label htmlFor="signin-name">Full name</Label>
                <Input id="signin-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-1">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </div>
            )}
            <Button type="submit" disabled={submitting} className="w-full" style={btnStyle}>
              {submitting
                ? 'Working…'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Send reset link'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              {mode === 'login' && (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="underline underline-offset-2 hover:text-foreground">
                    Create one
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode('login')} className="underline underline-offset-2 hover:text-foreground">
                    Sign in
                  </button>
                </>
              )}
              {mode === 'forgot' && (
                <button type="button" onClick={() => setMode('login')} className="underline underline-offset-2 hover:text-foreground">
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
