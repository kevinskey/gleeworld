import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { UniversalFooter } from '@/components/layout/UniversalFooter';
import { Heart, Mail, Lock, AlertCircle, CheckCircle, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MemberRegistration = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'check' | 'register' | 'reset' | 'success'>('check');
  const [userExists, setUserExists] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const checkEmailExists = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user exists by trying to sign in with a dummy password
      // This is a common pattern to check user existence
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-for-check'
      });

      if (signInError?.message.includes('Invalid login credentials')) {
        // User might exist but wrong password, or user doesn't exist
        // Try password reset to definitively check
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (resetError && resetError.message.includes('User not found')) {
          // User doesn't exist
          setUserExists(false);
          setMode('register');
        } else {
          // User exists
          setUserExists(true);
          setMode('reset');
        }
      } else if (!signInError) {
        // User exists and password was correct (shouldn't happen with dummy password)
        setUserExists(true);
        setMode('reset');
      }
    } catch (err) {
      setError('Unable to check email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
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
      const redirectUrl = `${window.location.origin}/onboarding`;
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setMode('success');
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account, then you'll be redirected to complete your onboarding.",
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      setMode('success');
      toast({
        title: "Password reset email sent!",
        description: "Please check your email for instructions to reset your password.",
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const renderCheckEmailForm = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Music className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Join the Glee Club Family</CardTitle>
        <p className="text-muted-foreground">
          Enter your email to get started with your musical journey
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="your.email@spelman.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={checkEmailExists} 
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? 'Checking...' : 'Continue'}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth" className="text-primary hover:underline">
            Sign in here
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const renderRegistrationForm = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
            <Heart className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">Create Your Account</CardTitle>
        <p className="text-muted-foreground">
          Welcome! Let's set up your new account for {email}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Choose a secure password"
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
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating Account...' : 'Create Account & Continue to Onboarding'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button 
            variant="ghost" 
            onClick={() => setMode('check')}
            className="text-sm"
          >
            ← Back to email check
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPasswordResetForm = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-3">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">Welcome Back!</CardTitle>
        <p className="text-muted-foreground">
          We found your account for {email}. Let's reset your password so you can access your account.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            We'll send you a secure link to reset your password. After resetting, you'll be able to access your account and continue with any pending onboarding steps.
          </p>
        </div>

        <Button 
          onClick={handlePasswordReset} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sending Reset Email...' : 'Send Password Reset Email'}
        </Button>

        <div className="text-center space-y-2">
          <Button 
            variant="ghost" 
            onClick={() => setMode('check')}
            className="text-sm"
          >
            ← Back to email check
          </Button>
          <div className="text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to="/auth" className="text-primary hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSuccessMessage = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">Check Your Email</CardTitle>
        <p className="text-muted-foreground">
          We've sent instructions to {email}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">
            {userExists 
              ? "We've sent you a password reset link. Click the link in your email to set a new password."
              : "We've sent you a verification link. Click the link in your email to verify your account and you'll be automatically taken to complete your onboarding."
            }
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Didn't receive the email? Check your spam folder or{' '}
          <Button 
            variant="link" 
            className="p-0 h-auto text-primary hover:underline"
            onClick={() => setMode('check')}
          >
            try again
          </Button>
        </div>

        <Separator />

        <div className="text-center">
          <Link to="/auth">
            <Button variant="outline" className="w-full">
              Return to Main Login
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />
      
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-8 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur px-4 py-2 text-sm font-medium">
              <Heart className="h-4 w-4 text-primary" />
              Join the Legacy
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Spelman Glee Club
            </h1>
            <p className="text-muted-foreground">
              100+ years of musical excellence starts with you
            </p>
          </div>

          {/* Dynamic Form Content */}
          {mode === 'check' && renderCheckEmailForm()}
          {mode === 'register' && renderRegistrationForm()}
          {mode === 'reset' && renderPasswordResetForm()}
          {mode === 'success' && renderSuccessMessage()}

          {/* Help Text */}
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

export default MemberRegistration;