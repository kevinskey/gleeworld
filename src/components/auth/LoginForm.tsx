
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useSecurityEnhanced } from "@/hooks/useSecurityEnhanced";

interface LoginFormProps {
  onSwitchToForgot: () => void;
}

export const LoginForm = ({ onSwitchToForgot }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { enhancedSignIn } = useSecurityEnhanced();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await enhancedSignIn(email, password);
      
      // Don't force redirect - let the role-based redirect handle it
      // The AuthContext and useRoleBasedRedirect will handle the appropriate redirect
    } catch (error: any) {
      setError(error.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:border-white/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:border-white/50"
          />
        </div>
        
        <Button type="submit" className="w-full bg-[#0066CC] hover:bg-[#0077DD] text-white border border-white/20" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign In
        </Button>
        
        <div className="text-center">
          <Button 
            type="button" 
            variant="link" 
            onClick={onSwitchToForgot}
            className="text-sm text-white/80 hover:text-white"
          >
            Forgot your password?
          </Button>
        </div>
      </form>
    </div>
  );
};
