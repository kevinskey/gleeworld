import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, UserPlus } from 'lucide-react';

export const AdminBootstrap = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const bootstrapAdmin = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "You must be logged in to bootstrap admin access",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Try the bootstrap function first
      const { data, error } = await supabase.rpc('bootstrap_initial_admin', {
        user_email_param: user.email
      });

      if (error) {
        console.error('Bootstrap function error:', error);
        throw error;
      }

      // Also try to update the gw_profiles table directly
      const { error: updateError } = await supabase
        .from('gw_profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          is_super_admin: true,
          is_admin: true,
          role: 'super-admin',
          verified: true
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Super admin privileges granted! Please refresh the page.",
      });

    } catch (error) {
      console.error('Error bootstrapping admin:', error);
      toast({
        title: "Error",
        description: `Failed to grant admin privileges: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentStatus = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, role, verified')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      toast({
        title: "Current Status",
        description: data 
          ? `Admin: ${data.is_admin}, Super Admin: ${data.is_super_admin}, Role: ${data.role}, Verified: ${data.verified}`
          : "No profile found in database",
      });
    } catch (error) {
      console.error('Error checking status:', error);
      toast({
        title: "Error",
        description: `Failed to check status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please log in to use admin bootstrap</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Bootstrap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Current user: <strong>{user.email}</strong></p>
          <p>User ID: <code className="text-xs">{user.id}</code></p>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={bootstrapAdmin} 
            disabled={loading}
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Grant Super Admin Access
          </Button>
          
          <Button 
            onClick={checkCurrentStatus} 
            variant="outline"
            className="w-full"
          >
            Check Current Status
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>This will grant you super admin privileges. After clicking, refresh the page to see the Administrator tab.</p>
        </div>
      </CardContent>
    </Card>
  );
};