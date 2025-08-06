import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink } from 'lucide-react';

interface GoogleAuthProps {
  onAuthSuccess?: () => void;
  serviceType?: 'docs' | 'sheets';
  edgeFunctionName?: string;
}

export const GoogleAuth = ({ 
  onAuthSuccess, 
  serviceType = 'docs', 
  edgeFunctionName = 'google-docs-manager' 
}: GoogleAuthProps) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const initiateGoogleAuth = async () => {
    try {
      setIsAuthenticating(true);
      
      if (serviceType === 'sheets' && edgeFunctionName === 'glee-sheets-api') {
        // For Google Sheets, use the edge function to get auth URL
        const { data, error } = await supabase.functions.invoke('glee-sheets-api', {
          body: { action: 'get_auth_url' }
        });

        if (error) throw error;

        if (data.error) {
          if (data.error.includes('Google Client ID not configured')) {
            toast({
              title: "Configuration Required",
              description: "Google API credentials need to be configured. Please check Supabase secrets.",
              variant: "destructive"
            });
            return;
          }
          throw new Error(data.error);
        }

        setAuthUrl(data.authUrl);
        window.open(data.authUrl, 'google-auth', 'width=500,height=600');
        
        toast({
          title: "Authentication Started",
          description: "Complete authentication in the popup window.",
        });
      } else {
        // For Google Docs, use the edge function to get auth URL
        const { data, error } = await supabase.functions.invoke(edgeFunctionName, {
          body: { action: 'get_auth_url' }
        });

        if (error) throw error;

        if (data.error) {
          if (data.error.includes('Google API credentials not configured')) {
            toast({
              title: "Configuration Required",
              description: "Google API credentials need to be configured. Please check Supabase secrets.",
              variant: "destructive"
            });
            return;
          }
          throw new Error(data.error);
        }

        setAuthUrl(data.authUrl);
        window.open(data.authUrl, 'google-auth', 'width=500,height=600');
        
        toast({
          title: "Authentication Started",
          description: "Complete authentication in the popup window.",
        });
      }
      
    } catch (error) {
      console.error('Error initiating Google auth:', error);
      toast({
        title: "Authentication Error",
        description: `Failed: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      // Check if user is authenticated and has Google provider
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.app_metadata.providers?.includes('google')) {
        toast({
          title: "Authentication Successful", 
          description: `Google ${serviceType === 'sheets' ? 'Sheets' : 'Docs'} integration is ready.`,
        });
        onAuthSuccess?.();
      } else {
        toast({
          title: "Authentication Required",
          description: "Please complete the Google authentication process.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      toast({
        title: "Error",
        description: "Failed to check authentication status.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Google {serviceType === 'sheets' ? 'Sheets' : 'Docs'} Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Authenticate with Google to enable Google {serviceType === 'sheets' ? 'Sheets' : 'Docs'} integration{serviceType === 'sheets' ? ' for ledger management' : ' for meeting minutes'}.
        </p>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={initiateGoogleAuth}
          disabled={isAuthenticating}
          size="sm"
        >
          {isAuthenticating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <ExternalLink className="mr-2 h-4 w-4" />
          Authenticate with Google
        </Button>

        <Button 
          onClick={checkAuthStatus}
          variant="outline"
          size="sm"
        >
          Check Status
        </Button>
      </div>

      {authUrl && (
        <div className="text-xs text-muted-foreground">
          If the authentication window didn't open, {' '}
          <a 
            href={authUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            click here to authenticate manually
          </a>
        </div>
      )}
    </div>
  );
};