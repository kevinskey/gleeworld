import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuditionForm } from "../AuditionFormProvider";
import { useNavigate } from "react-router-dom";
import { getOrgName } from '@/lib/orgName';

// The account used to be step one, created client-side via supabase.auth.signUp
// before the visitor had answered a single question — and with email
// confirmation on, signUp returns no session, dead-ending the whole
// interview at submit. The account step is last now: the server creates the
// account as part of the same request that files the application (see
// AuditionPage's onSubmit / submitPublicIntake), so there is nothing to do
// here but collect the credentials and let the form's own submit button
// carry them.
export function RegistrationPage() {
  const { form } = useAuditionForm();
  const navigate = useNavigate();

  const handleExistingUserLogin = () => {
    // Redirect to login page with audition redirect
    navigate('/auth?redirect=/auditions');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Create your account & submit</h2>
        <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
          Your {getOrgName()} account is created when you submit, so you can track your application afterward.
        </p>
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

      <div className="pt-3 md:pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleExistingUserLogin}
          className="w-full h-10 text-sm"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
}