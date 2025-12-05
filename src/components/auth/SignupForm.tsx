
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSecurityEnhanced } from "@/hooks/useSecurityEnhanced";
import { Loader2, Users, Heart } from "lucide-react";

export const SignupForm = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isFanSignup, setIsFanSignup] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  
  const { enhancedSignUp, checkRateLimit } = useSecurityEnhanced();

  useEffect(() => {
    const role = searchParams.get('role');
    setIsFanSignup(role === 'fan');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Check rate limit before proceeding
      if (!checkRateLimit('signup', email)) {
        setError("Too many signup attempts. Please try again later.");
        return;
      }

      // Use enhanced signup with security validation
      const result = await enhancedSignUp(
        email, 
        password, 
        fullName, 
        isFanSignup ? 'fan' : 'user'
      );

      if (!result.user) {
        throw new Error("Signup failed - please try again");
      }
      // Persist intended redirect for post-auth
      try { sessionStorage.setItem('redirectAfterAuth', '/auditioner'); } catch {}
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage(null);
    setError("");
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auditioner` }
      });
      if (error) throw error;
      setResendMessage('Verification email resent. Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            {isFanSignup 
              ? "Welcome to the GleeWorld fan community! Please verify your email to complete registration."
              : "Please verify your email to complete your registration."}
          </AlertDescription>
        </Alert>
        {resendMessage && (
          <Alert>
            <AlertDescription>{resendMessage}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button type="button" onClick={handleResendVerification} disabled={resendLoading}>
            {resendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Resend verification email
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              try { sessionStorage.setItem('redirectAfterAuth', '/auditioner'); } catch {}
              window.location.href = '/auditioner';
            }}
          >
            Go to Auditioner Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isFanSignup && (
        <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-5 w-5 text-secondary" />
            <Badge variant="secondary" className="text-sm">Fan Registration</Badge>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Join the GleeWorld fan community and get exclusive access to content and events!
          </p>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            title="Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters"
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isFanSignup ? (
            <>
              <Heart className="mr-2 h-4 w-4" />
              Join as Fan
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </div>
  );
};
