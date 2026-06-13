import React, { useState, useEffect } from 'react';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, LogIn, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gleeWorldLogoCircle from '@/assets/glee-world-logo-circle.png';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

// YIQ contrast → pure black or white so text on the tenant primary stays readable.
function readableForeground(hex: string): string {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0f172a' : '#ffffff';
}

export default function AuthPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { settings: branding } = useBrandingSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fall back to the published site's header block logo (set via the public
  // page builder) when gw_branding_settings.logo_url is empty — most tenants
  // upload through the page builder, not site setup.
  const { data: publicSite } = useQuery<{ blocks?: Array<{ block_type: string; config: { logoUrl?: string; siteName?: string } }>; theme?: { primaryColor?: string }; org_name?: string; logo_url?: string } | null>({
    queryKey: ['auth-tenant-site'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_public_site');
      if (error) return null;
      return data as any;
    },
  });
  const headerBlock = publicSite?.blocks?.find((b) => b.block_type === 'header');
  const siteLogo = headerBlock?.config?.logoUrl || publicSite?.logo_url;
  const siteHeading = headerBlock?.config?.siteName || publicSite?.org_name;
  const sitePrimary = publicSite?.theme?.primaryColor;

  const siteName = siteHeading || branding.short_name || branding.org_name || 'GleeWorld';
  const orgName = branding.org_name || siteName;
  const primary = sitePrimary || branding.primary_color || '#0f172a';
  const fg = readableForeground(primary);
  const logo = siteLogo || branding.logo_url || gleeWorldLogoCircle;

  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(searchParams.get('forgot') === 'true');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const getRedirectTarget = () => {
    const storedRedirect = sessionStorage.getItem('redirectAfterAuth');
    if (storedRedirect) {
      sessionStorage.removeItem('redirectAfterAuth');
      return storedRedirect;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    const hasTimeSlot = urlParams.get('timeSlot');
    if (returnTo) return returnTo;
    if (hasTimeSlot) return '/audition-application';
    return '/';
  };

  useEffect(() => {
    if (user && !loading) {
      navigate(getRedirectTarget(), { replace: true });
    }
  }, [user, loading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Welcome back!', description: 'You have been successfully logged in.' });
        navigate(getRedirectTarget(), { replace: true });
      } else {
        const redirectUrl = `${window.location.origin}/audition-application`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: name, tenant_slug: getTenantSlug() },
          },
        });
        if (error) throw error;
        if (data.user && !data.user.email_confirmed_at) {
          toast({
            title: 'Check your email',
            description: 'We sent you a confirmation link. Please check your email to complete registration.',
          });
        } else {
          toast({
            title: 'Account created!',
            description: 'Please complete your audition application.',
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: 'Authentication failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
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
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: primary, color: fg }}>
        <div className="text-center">
          <img src={logo} alt="" className="h-14 w-14 mx-auto mb-4 object-contain animate-pulse" />
          <p className="text-lg opacity-80">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: primary,
        color: fg,
        paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="absolute z-20 hover:bg-white/10 border"
        style={{
          top: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))',
          left: 'max(1rem, env(safe-area-inset-left))',
          color: fg,
          borderColor: fg === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.2)',
        }}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {/* Logo sits on a contrast badge so transparent PNGs read whether
                the page primary is light or dark. The badge picks the
                opposite tone of the foreground — dark page → light badge,
                light page → dark badge. */}
            <div
              className="inline-flex items-center justify-center rounded-2xl p-3 sm:p-4 shadow-xl"
              style={{ background: fg === '#ffffff' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.92)' }}
            >
              <img
                src={logo}
                alt={orgName}
                className="h-16 w-auto sm:h-20 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = gleeWorldLogoCircle;
                }}
              />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 drop-shadow-sm" style={{ color: fg }}>
            {siteName}
          </h1>
          <p className="text-sm opacity-80" style={{ color: fg }}>
            {isForgotPassword
              ? 'Enter your email to receive a reset link.'
              : isLogin
                ? 'Sign in to your account'
                : 'Create your account'}
          </p>
        </div>

        <Card className="bg-white border-0 shadow-2xl overflow-hidden text-slate-900">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center justify-center text-base font-semibold text-slate-900 mb-5">
              {isForgotPassword ? (
                <>
                  <KeyRound className="h-5 w-5 mr-2" /> Reset password
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="h-5 w-5 mr-2" /> Welcome back
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" /> Create account
                </>
              )}
            </div>

            {isForgotPassword ? (
              resetEmailSent ? (
                <div className="text-center py-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: primary + '22' }}
                  >
                    <KeyRound className="h-7 w-7" style={{ color: primary }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Check your email</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    We sent a password reset link to <strong>{email}</strong>
                  </p>
                  <Button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetEmailSent(false);
                      navigate('/auth');
                    }}
                    className="w-full"
                    style={{ background: primary, color: fg }}
                  >
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-slate-800">Email address</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full font-semibold"
                    disabled={isSubmitting}
                    style={{ background: primary, color: fg }}
                  >
                    {isSubmitting ? 'Sending…' : 'Send reset link'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        navigate('/auth');
                      }}
                      className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
                    >
                      Back to sign in
                    </button>
                  </div>
                </form>
              )
            ) : (
              <>
                <form onSubmit={handleAuth} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block text-slate-800">Full name</label>
                      <Input
                        type="text"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-slate-800">Email address</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-slate-800">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800"
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
                          className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full font-semibold py-5 text-base"
                    disabled={isSubmitting}
                    style={{ background: primary, color: fg }}
                  >
                    {isSubmitting
                      ? isLogin
                        ? 'Signing in…'
                        : 'Creating account…'
                      : isLogin
                        ? 'Sign in'
                        : 'Create account & apply'}
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
                  >
                    {isLogin
                      ? "Don't have an account? Create one"
                      : 'Already have an account? Sign in'}
                  </button>
                </div>

                {!isLogin && (
                  <div className="mt-5 p-3 rounded-lg text-sm" style={{ background: primary + '0d', color: '#0f172a' }}>
                    <strong>New users:</strong> After creating your account, you&apos;ll be redirected to fill out your audition application.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs mt-6 opacity-60" style={{ color: fg }}>
          © {new Date().getFullYear()} {orgName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
