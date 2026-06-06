
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSecurityEnhanced } from "@/hooks/useSecurityEnhanced";
import { useRegistrationRequest } from "@/hooks/useRegistrationRequest";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { Loader2, Users, Heart, ArrowLeft } from "lucide-react";

type SignupStep = 'credentials' | 'role-selection';

export const SignupForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  
  // Multi-step signup state
  const [currentStep, setCurrentStep] = useState<SignupStep>('credentials');
  const [signedUpUserId, setSignedUpUserId] = useState<string | null>(null);
  const [isFanOrAlumnaFlow, setIsFanOrAlumnaFlow] = useState(false);
  
  const { enhancedSignUp, checkRateLimit } = useSecurityEnhanced();
  const { createRegistrationRequest, loading: registrationLoading } = useRegistrationRequest();

  useEffect(() => {
    const role = searchParams.get('role');
    // If role is fan or graduate, we'll show role selection after signup
    setIsFanOrAlumnaFlow(role === 'fan' || role === 'graduate');
  }, [searchParams]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
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
      // Use 'user' role initially - actual role will be set after approval
      const result = await enhancedSignUp(
        email, 
        password, 
        fullName, 
        'user'
      );

      if (!result.user) {
        throw new Error("Signup failed - please try again");
      }

      setSignedUpUserId(result.user.id);

      // If this is a fan/graduate flow, show role selection
      if (isFanOrAlumnaFlow) {
        setCurrentStep('role-selection');
      } else {
        // Regular signup - redirect to auditioner dashboard
        try { sessionStorage.setItem('redirectAfterAuth', '/auditioner'); } catch {}
        setSuccess(true);
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelected = async (
    role: 'fan' | 'graduate', 
    additionalData?: { graduationYear?: number; voicePart?: string }
  ) => {
    if (!signedUpUserId) {
      setError("Session error - please try again");
      return;
    }

    const result = await createRegistrationRequest(
      signedUpUserId,
      email,
      fullName,
      {
        role,
        graduationYear: additionalData?.graduationYear,
        voicePart: additionalData?.voicePart
      }
    );

    if (result.success) {
      // Redirect to thank you page
      navigate(`/registration-thank-you?role=${role}`);
    } else {
      setError(result.error || "Failed to submit registration request");
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

  // Success state for regular signup
  if (success) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Please verify your email to complete your registration.
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

  // Role selection step
  if (currentStep === 'role-selection') {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setCurrentStep('credentials')}
          className="text-white/70 hover:text-white hover:bg-white/10 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <RoleSelectionStep 
          onRoleSelected={handleRoleSelected}
          loading={registrationLoading}
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isFanOrAlumnaFlow && (
        <div className="text-center p-4 bg-white/10 rounded border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-5 w-5 text-white" />
            <Badge variant="secondary" className="text-sm bg-white/20 text-white border-white/30">
              {searchParams.get('role') === 'fan' ? 'Fan Registration' : 'Graduate Registration'}
            </Badge>
            <Users className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm text-white/80">
            {searchParams.get('role') === 'fan' 
              ? 'Join the GleeWorld fan community and get exclusive access to content and events!'
              : 'Reconnect with your Glee Club sisters and access exclusive graduates features!'}
          </p>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-white">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="bg-black/40 border-white/40 text-white placeholder:text-white/60 focus:border-white/70 focus:bg-black/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-white">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-black/40 border-white/40 text-white placeholder:text-white/60 focus:border-white/70 focus:bg-black/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-white">Password</Label>
          <Input
            id="signup-password"
            type="password"
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            title="Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters"
            className="bg-black/40 border-white/40 text-white placeholder:text-white/60 focus:border-white/70 focus:bg-black/50"
          />
        </div>
        
        <Button type="submit" className="w-full bg-[#0066CC] hover:bg-[#0077DD] text-white border border-white/20" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isFanOrAlumnaFlow ? 'Continue' : 'Create Account'}
        </Button>
      </form>
    </div>
  );
};
