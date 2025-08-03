import { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuditionForm } from "../AuditionFormProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function RegistrationPage() {
  const { form, setIsNewUser } = useAuditionForm();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);

  // If user is already logged in, skip this page
  if (user) {
    return null;
  }

  const handleExistingUserLogin = () => {
    setIsNewUser(false);
    // Redirect to login page with audition redirect
    navigate('/auth?redirect=/auditions');
  };

  const handleRegisterAndContinue = async () => {
    const email = form.getValues('email');
    const password = form.getValues('password');
    
    if (!email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsRegistering(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auditions`
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Account created! Please continue with your audition.");
        setIsNewUser(true);
        // The form will automatically proceed to the next page
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Create Your Account</h2>
        <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Join the Spelman College Glee Club community</p>
      </div>

      <div className="space-y-3 md:space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Email Address</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="Enter your email address" 
                  className="h-10"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Password</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="Create a secure password (min 8 characters)" 
                  className="h-10"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Confirm Password</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="Confirm your password" 
                  className="h-10"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-4 md:mt-8 p-3 md:p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-1 md:mb-2 text-sm md:text-base">Why Create an Account?</h4>
        <ul className="text-xs md:text-sm text-blue-800 space-y-0.5 md:space-y-1">
          <li>• Submit your audition application</li>
          <li>• Track your application status</li>
          <li>• Access exclusive Glee Club resources</li>
          <li>• Connect with the Glee Club community</li>
        </ul>
      </div>

      <div className="pt-3 md:pt-4 border-t md:hidden">
        <Button
          type="button"
          onClick={handleRegisterAndContinue}
          disabled={isRegistering || !form.getValues('email') || !form.getValues('password')}
          className="w-full mb-2 bg-purple-600 hover:bg-purple-700 h-10 text-sm"
        >
          {isRegistering ? "Creating Account..." : "Create Account & Continue"}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleExistingUserLogin}
          className="w-full h-10 text-sm"
        >
          Already have an account? Sign In
        </Button>
      </div>

      {/* Desktop buttons - hidden on mobile since navigation is in fixed bottom bar */}
      <div className="pt-4 border-t hidden md:block">
        <Button
          type="button"
          onClick={handleRegisterAndContinue}
          disabled={isRegistering || !form.getValues('email') || !form.getValues('password')}
          className="w-full mb-3 bg-purple-600 hover:bg-purple-700"
        >
          {isRegistering ? "Creating Account..." : "Create Account & Continue"}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleExistingUserLogin}
          className="w-full"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
}