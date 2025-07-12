
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    const role = searchParams.get('role');
    setIsFanSignup(role === 'fan');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${isFanSignup ? '/public-calendar' : '/dashboard'}`,
          data: {
            full_name: fullName,
            role: isFanSignup ? 'fan' : 'user',
          }
        }
      });

      if (error) throw error;
      
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert>
        <AlertDescription>
          {isFanSignup 
            ? "Welcome to the GleeWorld fan community! Check your email for a verification link to complete your registration and unlock exclusive fan content."
            : "Check your email for a verification link to complete your registration."
          }
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isFanSignup && (
        <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-5 w-5 text-secondary" />
            <Badge variant="secondary" className="text-sm">Fan Registration</Badge>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-gray-600">
            Join the GleeWorld fan community and get exclusive access to content and events!
          </p>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
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
          minLength={6}
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
  );
};
