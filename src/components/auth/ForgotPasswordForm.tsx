
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export const ForgotPasswordForm = ({ onSwitchToLogin }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;
      
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <Alert className="bg-white/20 border-white/30 text-white">
          <AlertDescription>
            Check your email for a password reset link.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onSwitchToLogin} className="w-full border-white/30 text-white hover:bg-white/10 hover:text-white">
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="reset-email" className="text-white">Email</Label>
        <Input
          id="reset-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:border-white/50"
        />
      </div>
      
      <Button type="submit" className="w-full bg-[#0066CC] hover:bg-[#0077DD] text-white border border-white/20" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send Reset Link
      </Button>
      
      <Button variant="outline" onClick={onSwitchToLogin} className="w-full border-white/30 text-white hover:bg-white/10 hover:text-white">
        Back to Sign In
      </Button>
    </form>
  );
};
