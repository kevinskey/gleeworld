import React, { useState, useEffect } from 'react';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, LogIn, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gleeWorldLogoCircle from '@/assets/glee-world-logo-circle.png';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { getOrgName } from '@/lib/orgName';
import { tenantAuthGradient, tenantButtonGradient } from '@/lib/tenantGradient';
import { isDemoTenant } from '@/lib/demoTenant';
import { RequestWorkspaceDialog } from '@/components/leads/RequestWorkspaceDialog';

export default function AuthPage() {
  const {
    user,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const { settings: branding } = useBrandingSettings();
  const siteName = branding.short_name || branding.org_name || 'GleeWorld';
  // Auth background gradient derived from the tenant's primary color so
  // login / signup chrome matches the tenant's brand.
  // If the tenant has set a hero image for auth, render it behind a dark
  // overlay so the form stays legible. Otherwise fall back to the
  // primary-color-derived gradient.
  const hasAuthImage = !!branding.auth_background_url;
  const authBackgroundStyle: React.CSSProperties = hasAuthImage
    ? {
        backgroundImage: `url(${branding.auth_background_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#0a0518',
      }
    : { background: tenantAuthGradient(branding.primary_color) };
  const buttonGradient = tenantButtonGradient(branding.primary_color);
  const tenantLogo = branding.logo_url || gleeWorldLogoCircle;
  const SANS = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(searchParams.get('forgot') === 'true');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const onDemoTenant = isDemoTenant();
  const demoError = new URLSearchParams(window.location.search).get('demoError') === '1';
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const getRedirectTarget = () => {
    // Check sessionStorage first for stored redirect path
    const storedRedirect = sessionStorage.getItem('redirectAfterAuth');
    if (storedRedirect) {
      sessionStorage.removeItem('redirectAfterAuth');
      return storedRedirect;
    }

    // Fall back to URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    const hasTimeSlot = urlParams.get('timeSlot');
    if (returnTo) return returnTo;
    if (hasTimeSlot) return '/audition-application';

    // Regular auth: go to root and let useRoleBasedRedirect pick the
    // role-appropriate destination (super-admin → /control-center, etc.)
    return '/';
  };
  useEffect(() => {
    // If user is already authenticated, redirect them
    if (user && !loading) {
      const target = getRedirectTarget();
      navigate(target, {
        replace: true
      });
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (onDemoTenant) setIsLogin(true); // no public signup into the demo tenant
  }, [onDemoTenant]);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isLogin) {
        // Login flow
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in."
        });

        // No full page reload—navigate within the SPA to avoid a white screen.
        const target = getRedirectTarget();
        navigate(target, {
          replace: true
        });
      } else {
        // Signup flow
        // Public sign-ups become fans (students are enrolled by super-admins).
        const redirectUrl = `${window.location.origin}/fan`;
        const {
          data,
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: name,
              tenant_slug: getTenantSlug()
            }
          }
        });
        if (error) throw error;
        if (data.user && !data.user.email_confirmed_at) {
          toast({
            title: "Check your email",
            description: "We sent you a confirmation link. Please check your email to complete registration."
          });
        } else {
          toast({
            title: "Account created!",
            description: "Welcome — your fan account is ready."
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Current origin, not gleeworld.org — a tenant admin resetting from
        // theirchoir.gleeworld.org must land back on their own site.
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast({
        title: "Check your email",
        description: "We sent you a password reset link."
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center relative auth-page" style={authBackgroundStyle}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="text-center relative z-10">
          <img src={tenantLogo} alt="Loading" className="h-12 w-12 mx-auto mb-4 animate-pulse rounded-full object-contain" />
          <p className="text-white/90 text-lg">Loading...</p>
        </div>
      </div>;
  }
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition";
  const focusRing: React.CSSProperties = { ['--tw-ring-color' as never]: 'hsl(265, 60%, 60%)' };

  return (
    <div
      className="relative flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] auth-page"
      style={{
        // 100dvh tracks the dynamic viewport (iOS/iPad WKWebView used to
        // serve 100vh shorter than the visible area, leaving the body's
        // solid background bleeding through and "losing" our gradient).
        minHeight: '100dvh',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        fontFamily: SANS,
      }}
    >
      {/* Background layer pinned to the viewport so it never depends on
          flex sizing or vh math. Sits behind the form card (z-0). */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={authBackgroundStyle}
        aria-hidden="true"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="absolute z-20 text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm transition-all duration-300"
        style={{
          top: 'max(1.5rem, calc(env(safe-area-inset-top) + 0.5rem))',
          left: 'max(1.5rem, env(safe-area-inset-left))',
        }}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Button>

      <div className="w-full max-w-md relative z-10 sm:translate-x-[200px]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src={tenantLogo}
              alt={`${siteName} logo`}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full bg-white/5 p-1 drop-shadow-xl"
            />
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1.5"
            style={{ fontFamily: SANS, letterSpacing: '-0.02em' }}
          >
            {siteName}
          </h1>
          <p className="text-white/85 text-sm sm:text-base">
            {isForgotPassword
              ? 'Reset your password'
              : isLogin
              ? 'Sign in to access your account'
              : 'Create an account to get started'}
          </p>
        </div>

        {/* Auth card — liquid glass.
            At bg-white/85 there was almost nothing left for backdrop-blur to
            blur, so the card read as flat grey. Glass needs the background
            actually visible: a lighter fill, a wide blur, and saturation to
            keep the photo's colour from going muddy behind the frost.
            The supports- variants fall back to a near-opaque card wherever
            backdrop-filter is unavailable, so the form never loses contrast. */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]
                     bg-white/80
                     supports-[backdrop-filter]:bg-white/55
                     supports-[backdrop-filter]:backdrop-blur-2xl
                     supports-[backdrop-filter]:backdrop-saturate-150
                     border border-white/50 ring-1 ring-inset ring-white/25"
        >
          {/* Specular highlight: the bright top edge and soft sheen that make
              glass read as a lens rather than a translucent rectangle. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24
                       bg-gradient-to-b from-white/45 to-transparent"
          />
          <div className="relative px-7 sm:px-8 py-7 sm:py-8">
            <div className="flex items-center justify-center gap-2 mb-6 text-slate-900">
              {isForgotPassword ? (
                <>
                  <KeyRound className="h-5 w-5" />
                  <span className="text-lg sm:text-xl font-bold" style={{ letterSpacing: '-0.01em' }}>
                    Reset Password
                  </span>
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="h-5 w-5" />
                  <span className="text-lg sm:text-xl font-bold" style={{ letterSpacing: '-0.01em' }}>
                    Welcome back
                  </span>
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  <span className="text-lg sm:text-xl font-bold" style={{ letterSpacing: '-0.01em' }}>
                    Create account
                  </span>
                </>
              )}
            </div>

            {isForgotPassword ? (
              resetEmailSent ? (
                <div className="text-center py-2">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-white"
                    style={{ background: buttonGradient }}
                  >
                    <KeyRound className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Check your email</h3>
                  <p className="text-slate-800 text-sm mb-6">
                    We sent a reset link to <strong className="text-slate-900">{email}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetEmailSent(false);
                      navigate('/auth');
                    }}
                    className="w-full inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-slate-900 border border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-1.5 block">
                      Email
                    </label>
                    <Input
                      id="forgot-email"
                      name="email"
                      autoComplete="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={inputClass}
                      style={focusRing}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ background: buttonGradient }}
                  >
                    {isSubmitting ? 'Sending…' : 'Send reset link'}
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        navigate('/auth');
                      }}
                      className="text-xs font-semibold text-slate-800 hover:text-slate-900 underline-offset-2 hover:underline transition-colors"
                    >
                      Back to sign in
                    </button>
                  </div>
                </form>
              )
            ) : (
              <>
                {demoError && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      The one-click demo hit a snag. Try{' '}
                      <a href="/try" className="font-semibold underline underline-offset-2">opening it again</a>
                      {' '}— or reach us via "Request your workspace" below.
                    </p>
                  </div>
                )}
                <form onSubmit={handleAuth} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label htmlFor="auth-name" className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-1.5 block">
                        Full name
                      </label>
                      <Input
                        id="auth-name"
                        name="name"
                        autoComplete="name"
                        type="text"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                        className={inputClass}
                        style={focusRing}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="auth-email" className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-1.5 block">
                      Email
                    </label>
                    <Input
                      id="auth-email"
                      name="email"
                      autoComplete={isLogin ? 'username' : 'email'}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={inputClass}
                      style={focusRing}
                    />
                  </div>

                  <div>
                    <label htmlFor="auth-password" className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-1.5 block">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        name="password"
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={`${inputClass} pr-10`}
                        style={focusRing}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {isLogin && (
                      <div className="text-right mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            navigate('/auth?forgot=true');
                          }}
                          className="text-xs font-semibold text-slate-800 hover:text-slate-900 underline-offset-2 hover:underline transition-colors"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    style={{ background: buttonGradient }}
                  >
                    {isSubmitting
                      ? isLogin
                        ? 'Signing in…'
                        : 'Creating account…'
                      : isLogin
                      ? 'Sign in'
                      : 'Create account'}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  {onDemoTenant ? (
                    <button
                      type="button"
                      onClick={() => setWorkspaceOpen(true)}
                      className="text-xs font-semibold text-slate-800 hover:text-slate-900 transition-colors"
                    >
                      Want GleeWorld for your program?{' '}
                      <span className="underline underline-offset-2">Request your workspace</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-xs font-semibold text-slate-800 hover:text-slate-900 transition-colors"
                    >
                      {isLogin ? "Don't have an account? " : 'Already have an account? '}
                      <span className="underline underline-offset-2">
                        {isLogin ? 'Create one' : 'Sign in'}
                      </span>
                    </button>
                  )}
                </div>

                {!isLogin && (
                  <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-900">Becoming a fan:</strong> You'll get concert
                      announcements and access to the fan page. Students are enrolled separately by the
                      program director.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-xs">
            © {new Date().getFullYear()} {getOrgName()}. All rights reserved.
          </p>
        </div>
      </div>

      <RequestWorkspaceDialog open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} />
    </div>
  );
}