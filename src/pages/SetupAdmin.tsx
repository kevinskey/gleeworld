import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Crown, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SetupAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const makeAdmin = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to become an admin",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // First, check if user exists in profiles table
      const { data: existingProfile, error: fetchError } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('gw_profiles')
          .update({
            role: 'admin',
            verified: true,
            full_name: user.email?.split('@')[0] || 'Admin User'
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('gw_profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'admin',
            verified: true,
            full_name: user.email?.split('@')[0] || 'Admin User'
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Success!",
        description: "You are now an admin. Redirecting to admin dashboard...",
      });

      // Redirect to admin dashboard
      setTimeout(() => {
        navigate('/admin');
      }, 1500);

    } catch (error) {
      console.error('Error setting up admin:', error);
      toast({
        title: "Error",
        description: "Failed to set up admin role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-yellow-500" />
            <Shield className="h-8 w-8 text-blue-500" />
            <UserCog className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Admin Setup</CardTitle>
          <CardDescription>
            Set up your admin privileges to access the administrative dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Current User:</strong> {user.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click below to grant yourself admin privileges
                </p>
              </div>
              
              <Button 
                onClick={makeAdmin} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  "Setting up admin role..."
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Make Me Admin
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                This will grant you full administrative access to the platform
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">You must be logged in first</p>
              <Button onClick={() => navigate('/auth')} variant="outline">
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupAdmin;