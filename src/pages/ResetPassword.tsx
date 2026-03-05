import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { UniversalFooter } from '@/components/layout/UniversalFooter';
import { Lock, CheckCircle, AlertCircle, Music, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the auth state change — PKCE code exchange happens automatically
    // via detectSessionInUrl. We just need to wait for the resulting session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ResetPassword: auth event', event, !!session);
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true);
        setChecking(false);
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Also check if session already exists (e.g. user refreshed the page while still logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Safety timeout — if no session after 8 seconds, show error
    const timeout = setTimeout(() => {
      setChecking(false);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      sessionStorage.removeItem('password_recovery_active');
      toast({
        title: "Password updated successfully!",
        description: "You can now sign in with your new password.",
      });

      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <UniversalHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">Password Reset Complete!</CardTitle>
              <p className="text-muted-foreground">
                Your password has been successfully updated.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  You'll be automatically redirected in a few seconds...
                </p>
              </div>
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link to="/onboarding">Continue to Onboarding</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/auth">Go to Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <UniversalFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur px-4 py-2 text-sm font-medium">
              <Music className="h-4 w-4 text-primary" />
              Reset Your Password
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Spelman Glee Club
            </h1>
            <p className="text-muted-foreground">
              Set your new password to continue
            </p>
          </div>

          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Create New Password</CardTitle>
              <p className="text-muted-foreground">
                Choose a strong password for your account
              </p>
            </CardHeader>
            <CardContent>
              {checking ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
                </div>
              ) : !sessionReady ? (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This reset link has expired or is invalid. Please request a new password reset.
                    </AlertDescription>
                  </Alert>
                  <Button asChild className="w-full">
                    <Link to="/auth">Back to Login</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your new password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Password Requirements:</strong>
                      </p>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                        <li>• At least 6 characters long</li>
                        <li>• Use a mix of letters, numbers, and symbols</li>
                        <li>• Don't use easily guessable information</li>
                      </ul>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Updating Password...' : 'Update Password & Continue to Onboarding'}
                    </Button>
                  </form>

                  <div className="mt-4 text-center">
                    <Link to="/auth" className="text-sm text-primary hover:underline">
                      Back to Login
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact us at{' '}
              <a href="mailto:support@gleeworld.org" className="text-primary hover:underline">
                support@gleeworld.org
              </a>
            </p>
          </div>
        </div>
      </main>
      <UniversalFooter />
    </div>
  );
};

export default ResetPassword;
