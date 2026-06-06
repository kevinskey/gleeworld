import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, LogIn, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gleeWorldLogoCircle from '@/assets/glee-world-logo-circle.png';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
const authBackground = '/lovable-uploads/1e93a440-6349-4948-a145-7b55dedea9fc.png';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(searchParams.get('forgot') === 'true');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
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

    // Regular auth, redirect to dashboard for members
    return '/dashboard';
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
        const redirectUrl = `${window.location.origin}/audition-application`;
        const {
          data,
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: name
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
            description: "Please complete your audition application."
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
        redirectTo: `https://gleeworld.org/reset-password`,
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
    return <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative auth-page" style={{
      backgroundImage: `url(${authBackground})`
    }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="text-center relative z-10">
          <img src={gleeWorldLogoCircle} alt="Loading" className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p className="text-white/90 text-lg">Loading...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] auth-page" style={{
    backgroundImage: `url(${authBackground})`,
    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
    paddingRight: 'max(1rem, env(safe-area-inset-right))'
  }}>
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />
      
      {/* Floating Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent/5 rounded-full blur-xl animate-pulse delay-500" />
      
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="absolute z-20 text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm transition-all duration-300" style={{
      top: 'max(1.5rem, calc(env(safe-area-inset-top) + 0.5rem))',
      left: 'max(1.5rem, env(safe-area-inset-left))'
    }}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Button>

      {/* Main Content */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="text-center mb-3 sm:mb-5 md:mb-8">
          <div className="flex justify-center mb-2 sm:mb-3 md:mb-5">
            <img src={gleeWorldLogoCircle} alt="GleeWorld.org logo" className="w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 object-contain drop-shadow-2xl" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-white mb-1 sm:mb-2 drop-shadow-2xl lg:text-5xl">
            {siteName}
          </h1>
          <h2 className="text-sm sm:text-base md:text-xl mb-1 sm:mb-2 md:mb-3 drop-shadow-lg font-serif text-white font-semibold">
            {isForgotPassword ? 'Reset Your Password' : 'Sign in or Create an account'}
          </h2>
          <p className="text-white/80 text-xs sm:text-sm md:text-base drop-shadow-md">
            {isForgotPassword 
              ? 'Enter your email to receive a reset link' 
              : isLogin 
                ? 'Sign in to access your account' 
                : 'Join our musical family'}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />
          
          <CardHeader className="relative py-3 sm:py-4 md:py-6">
            <CardTitle className="flex items-center justify-center text-base sm:text-lg md:text-3xl text-primary">
              {isForgotPassword ? <>
                  <KeyRound className="h-5 w-5 mr-2" />
                  Reset Password
                </> : isLogin ? <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Welcome Back
                </> : <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create Account
                </>}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="relative bg-brand-gradient-deep">
            {isForgotPassword ? (
              // Forgot Password Form
              resetEmailSent ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
                  <p className="text-white/80 text-sm mb-6">
                    We sent a password reset link to <strong className="text-white">{email}</strong>
                  </p>
                  <Button 
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetEmailSent(false);
                      navigate('/auth');
                    }}
                    className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-primary-foreground">
                      Email Address *
                    </label>
                    <Input 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                      className="auth-input" 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg font-semibold" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        navigate('/auth');
                      }}
                      className="text-sm text-white/80 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )
            ) : (
              // Login/Signup Form
              <>
                <form onSubmit={handleAuth} className="space-y-5">
                  {!isLogin && <div>
                      <label className="text-sm font-medium text-white/90 mb-2 block">
                        Full Name *
                      </label>
                      <Input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required={!isLogin} className="auth-input" />
                    </div>}

                  <div>
                    <label className="text-sm font-medium mb-2 block text-primary-foreground">
                      Email Address *
                    </label>
                    <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="auth-input" />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-primary-foreground">
                      Password *
                    </label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required className="auth-input pr-10" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-white/60 hover:text-white/80 hover:bg-white/10">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {isLogin && (
                      <div className="text-right mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            navigate('/auth?forgot=true');
                          }}
                          className="text-sm text-white/80 hover:text-white underline underline-offset-2 transition-colors"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? isLogin ? 'Signing in...' : 'Creating account...' : isLogin ? 'Sign In' : 'Create Account & Apply'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-white/80 hover:text-white text-sm transition-colors duration-300 no-underline">
                    {isLogin ? "Don't have an account? Create one here" : "Already have an account? Sign in here"}
                  </Button>
                </div>

                {!isLogin && <div className="mt-6 p-4 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
                    <p className="text-sm text-white/80">
                      <strong className="text-white">New users:</strong> After creating your account, you'll be redirected to fill out your audition application with your selected time slot automatically saved.
                    </p>
                  </div>}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/60 text-sm">
            © 2024 Your favorite band or choir. All rights reserved.
          </p>
        </div>
      </div>
    </div>;
}