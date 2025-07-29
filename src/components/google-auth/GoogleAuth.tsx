import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink } from 'lucide-react';

interface GoogleAuthProps {
  onAuthSuccess?: () => void;
}

export const GoogleAuth = ({ onAuthSuccess }: GoogleAuthProps) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const initiateGoogleAuth = async () => {
    try {
      setIsAuthenticating(true);
      
      const { data, error } = await supabase.functions.invoke('google-docs-manager', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;
      
      if (data?.authUrl) {
        setAuthUrl(data.authUrl);
        // Open in new window/tab for OAuth flow
        window.open(data.authUrl, '_blank', 'width=500,height=600');
        
        toast({
          title: "Authentication Started",
          description: "Please complete the Google authentication in the new window.",
        });
      }
    } catch (error) {
      console.error('Error initiating Google auth:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to start Google authentication process.",
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      // Check if we have a valid token by trying to get auth URL
      const { data, error } = await supabase.functions.invoke('google-docs-manager', {
        body: { action: 'create', title: 'Test', content: 'Test' }
      });

      if (data && !data.needsAuth) {
        toast({
          title: "Authentication Successful",
          description: "Google Docs integration is now ready.",
        });
        onAuthSuccess?.();
      } else if (data?.needsAuth) {
        toast({
          title: "Authentication Required",
          description: "Please complete the Google authentication process.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Google Docs Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Authenticate with Google to enable Google Docs integration for meeting minutes.
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