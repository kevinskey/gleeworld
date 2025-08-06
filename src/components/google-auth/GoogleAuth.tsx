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
      
      // Use Supabase's built-in Google OAuth provider
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file',
          redirectTo: `${window.location.origin}/google-docs`
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      toast({
        title: "Authentication Started",
        description: "Redirecting to Google for authentication...",
      });
      
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (user && session && user.app_metadata.providers?.includes('google')) {
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
        <p className="text-xs text-muted-foreground">
          Note: You'll need to configure Google OAuth in your Supabase dashboard for this to work.
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