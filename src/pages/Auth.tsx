
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, Mail, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cleanupAuthState, resetAuthState } from "@/utils/authCleanup";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    const checkUser = async () => {
      try {
        console.log('Auth: Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth: Error checking session:', error);
          // Clean up corrupted state
          await resetAuthState();
          setCheckingAuth(false);
          return;
        }
        
        if (session?.user) {
          console.log('Auth: User already authenticated, redirecting...', session.user.id);
          navigate("/");
          return;
        }
        
        console.log('Auth: No existing session found');
        setCheckingAuth(false);
      } catch (error) {
        console.error('Auth: Error checking auth status:', error);
        setCheckingAuth(false);
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Auth: Starting sign in process...');
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!email || !password) {
        throw new Error("Please enter both email and password");
      }

      console.log('Auth: Cleaning up existing state...');
      cleanupAuthState();
      
      console.log('Auth: Attempting sign in with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('Auth: Sign in error:', error);
        let errorMessage = error.message;
        
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and click the confirmation link before signing in.";
        } else if (error.message.includes('Too many requests')) {
          errorMessage = "Too many sign-in attempts. Please wait a moment and try again.";
        }
        
        throw new Error(errorMessage);
      }

      if (!data.user) {
        throw new Error("Sign in failed - no user data received");
      }

      console.log('Auth: Sign in successful for user:', data.user.id);
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
      
      // Small delay to ensure auth state is properly set
      setTimeout(() => {
        navigate("/");
      }, 100);
      
    } catch (error) {
      console.error('Auth: Sign in failed:', error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during sign in";
      setError(errorMessage);
      
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Auth: Starting sign up process...');
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!email || !password) {
        throw new Error("Please enter both email and password");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      console.log('Auth: Cleaning up existing state...');
      cleanupAuthState();
      
      console.log('Auth: Attempting sign up with email:', email);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('Auth: Sign up error:', error);
        let errorMessage = error.message;
        
        if (error.message.includes('already registered')) {
          errorMessage = "This email is already registered. Please sign in instead.";
        }
        
        throw new Error(errorMessage);
      }

      if (!data.user) {
        throw new Error("Sign up failed - no user data received");
      }

      console.log('Auth: Sign up successful for user:', data.user.id);
      
      if (data.session) {
        // User is automatically signed in
        toast({
          title: "Account created!",
          description: "Welcome to ContractFlow!",
        });
        navigate("/");
      } else {
        // Email confirmation required
        toast({
          title: "Account created!",
          description: "Please check your email for the confirmation link.",
        });
        setError("Please check your email for the confirmation link!");
      }
    } catch (error) {
      console.error('Auth: Sign up failed:', error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during sign up";
      setError(errorMessage);
      
      toast({
        title: "Sign Up Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Auth: Starting password reset...');
    setResetLoading(true);
    setError(null);

    try {
      if (!resetEmail) {
        throw new Error("Please enter your email address");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        console.error('Auth: Password reset error:', error);
        throw error;
      }

      console.log('Auth: Password reset email sent successfully');
      setResetSuccess(true);
      toast({
        title: "Password reset email sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error) {
      console.error('Auth: Password reset failed:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send reset email";
      setError(errorMessage);
      
      toast({
        title: "Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetAuth = async () => {
    console.log('Auth: Manual auth reset triggered');
    try {
      await resetAuthState();
      toast({
        title: "Authentication Reset",
        description: "Auth state has been cleared. Please try signing in again.",
      });
    } catch (error) {
      console.error('Auth: Reset failed:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset authentication state",
        variant: "destructive",
      });
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">ContractFlow</h1>
          </div>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="reset">Reset Password</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              {resetSuccess ? (
                <div className="text-center space-y-4">
                  <Mail className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
                  <p className="text-gray-600">
                    We've sent a password reset link to {resetEmail}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setResetSuccess(false);
                      setResetEmail("");
                      setError(null);
                    }}
                    className="w-full"
                  >
                    Send another email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={resetLoading}
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending reset email...
                      </>
                    ) : (
                      "Send Reset Email"
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Debug/Reset Option */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResetAuth}
              className="w-full text-xs text-gray-600 hover:text-gray-800"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Reset Authentication State
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
