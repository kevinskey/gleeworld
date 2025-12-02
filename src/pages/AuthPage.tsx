import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useToast } from '@/hooks/use-toast';
import { Music, UserPlus, LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const authBackground = '/lovable-uploads/1e93a440-6349-4948-a145-7b55dedea9fc.png';
export default function AuthPage() {
  const {
    user,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    // If user is already authenticated, redirect them
    if (user && !loading) {
      // Check sessionStorage first for stored redirect path
      const storedRedirect = sessionStorage.getItem('redirectAfterAuth');
      if (storedRedirect) {
        // Clear the stored redirect and use it
        sessionStorage.removeItem('redirectAfterAuth');
        window.location.href = storedRedirect;
        return;
      }

      // Fall back to URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo');
      const hasTimeSlot = urlParams.get('timeSlot');
      if (returnTo) {
        // User came from a specific page (like QR scanning), redirect back
        window.location.href = returnTo;
      } else if (hasTimeSlot) {
        // User came from booking flow
        window.location.href = '/audition-application';
      } else {
        // Regular auth, redirect to dashboard for members
        window.location.href = '/dashboard';
      }
    }
  }, [user, loading]);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isLogin) {
        // Login flow
        const {
          data,
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

        // Handle redirect after successful login
        // Check sessionStorage first
        const storedRedirect = sessionStorage.getItem('redirectAfterAuth');
        if (storedRedirect) {
          sessionStorage.removeItem('redirectAfterAuth');
          window.location.href = storedRedirect;
        } else {
          // Fall back to URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const returnTo = urlParams.get('returnTo');
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            window.location.href = '/dashboard';
          }
        }
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
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative auth-page" style={{
      backgroundImage: `url(${authBackground})`
    }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="text-center relative z-10">
          <Music className="h-12 w-12 text-white mx-auto mb-4 animate-pulse" />
          <p className="text-white/90 text-lg">Loading...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center justify-center p-4 auth-page" style={{
    backgroundImage: `url(${authBackground})`
  }}>
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />
      
      {/* Floating Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent/5 rounded-full blur-xl animate-pulse delay-500" />
      
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="absolute top-6 left-6 z-20 text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm transition-all duration-300">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Button>

      {/* Main Content */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full mb-6 border border-white/20 shadow-2xl">
            <Music className="h-10 w-10 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-2xl">
            Glee World! 
          </h1>
          <h2 className="text-6xl mb-4 drop-shadow-lg font-serif md:text-4xl text-muted bg-black/0 font-semibold">
            ​Sign in or Create an account     
          </h2>
          <p className="text-white/80 text-lg drop-shadow-md">
            {isLogin ? 'Sign in to access your account' : 'Join our musical family'}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />
          
          <CardHeader className="relative">
            <CardTitle className="flex items-center justify-center text-white text-xl">
              {isLogin ? <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Welcome Back
                </> : <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create Account
                </>}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="relative">
            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    Full Name *
                  </label>
                  <Input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required={!isLogin} className="auth-input" />
                </div>}

              <div>
                <label className="text-sm font-medium text-black mb-2 block">
                  Email Address *
                </label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="auth-input" />
              </div>

              <div>
                <label className="text-sm font-medium text-black mb-2 block">
                  Password *
                </label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required className="auth-input pr-10" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-white/60 hover:text-white/80 hover:bg-white/10">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 py-6 text-lg font-semibold" disabled={isSubmitting}>
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
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/60 text-sm">
            © 2024 Spelman College Glee Club. All rights reserved.
          </p>
        </div>
      </div>
    </div>;
}