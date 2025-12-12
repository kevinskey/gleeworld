import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'create' | 'sync' | 'get_url' | 'get_auth_url';
  minuteId?: string;
  title?: string;
  content?: string;
  code?: string; // OAuth authorization code
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication for non-OAuth requests
    if (req.method !== 'GET' || !new URL(req.url).searchParams.get('code')) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization header required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle OAuth callback (GET request with code parameter)
    const url = new URL(req.url);
    const oauthCode = url.searchParams.get('code');
    
    console.log('Request method:', req.method, 'OAuth code present:', !!oauthCode);
    
    if (req.method === 'GET' && oauthCode) {
      // This is an OAuth callback - handle token exchange
      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      
      if (!googleClientId || !googleClientSecret) {
        return new Response(
          JSON.stringify({ error: 'Google API credentials not configured' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-docs-manager`;
      
      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code: oauthCode,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Failed to exchange code for token:', errorText);
        return new Response(
          'Authentication failed. Please close this window and try again.',
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' }
          }
        );
      }

      const tokenData = await tokenResponse.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      
      console.log('Token exchange successful, storing tokens...');

      // Store the tokens in the database
      const { error: insertError } = await supabase
        .from('google_auth_tokens')
        .upsert({
          user_type: 'system',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'user_type'
        });

      if (insertError) {
        console.error('Failed to store tokens:', insertError);
        return new Response(
          'Failed to save authentication. Please try again.',
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' }
          }
        );
      }

      // Return success page
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #4CAF50; }
          </style>
        </head>
        <body>
          <h1 class="success">✓ Authentication Successful!</h1>
          <p>Google Docs integration has been enabled.</p>
          <p>You can now close this window and return to the app.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
        `,
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        }
      );
    }

    // Verify user authentication for non-OAuth requests
    let user = null;
    if (req.method !== 'GET' || !new URL(req.url).searchParams.get('code')) {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token || '');
      
      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      
      // Check if user is admin
      const { data: adminProfile } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, role')
        .eq('user_id', authUser.id)
        .single();

      if (!adminProfile || (!adminProfile.is_admin && !adminProfile.is_super_admin && adminProfile.role !== 'admin' && adminProfile.role !== 'super-admin')) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
      
      user = authUser;
    }

    // Handle POST requests with JSON body
    const { action, minuteId, title, content }: RequestBody = await req.json();
    
    // Get Google API credentials from Supabase secrets
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      console.error('Missing Google API credentials');
      return new Response(
        JSON.stringify({ error: 'Google API credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get access token (this is a simplified approach - in production you'd want proper token management)
    const getAccessToken = async (): Promise<string | null> => {
      try {
        // For now, we'll use a stored access token from the database
        // In a full implementation, you'd implement proper OAuth2 flow
        const { data, error } = await supabase
          .from('google_auth_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_type', 'system')
          .single();

        if (error || !data) {
          console.log('No stored access token found');
          return null;
        }

        // Check if token is expired
        if (data.expires_at && new Date(data.expires_at) <= new Date()) {
          // Try to refresh the token
          if (data.refresh_token) {
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: googleClientId,
                client_secret: googleClientSecret,
                refresh_token: data.refresh_token,
                grant_type: 'refresh_token',
              }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

              // Update stored token
              await supabase
                .from('google_auth_tokens')
                .update({
                  access_token: refreshData.access_token,
                  expires_at: expiresAt.toISOString(),
                })
                .eq('user_type', 'system');

              return refreshData.access_token;
            }
          }
          return null;
        }

        return data.access_token;
      } catch (error) {
        console.error('Error getting access token:', error);
        return null;
      }
    };

    switch (action) {
      case 'get_auth_url': {
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-docs-manager`;
        const scopes = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file';
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${googleClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes)}&` +
          `response_type=code&` +
          `access_type=offline&` +
          `prompt=consent`;

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (!title || !content) {
          return new Response(
            JSON.stringify({ error: 'Title and content are required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const accessToken = await getAccessToken();
        if (!accessToken) {
          return new Response(
            JSON.stringify({ 
              error: 'Google authentication required. Please authenticate first.',
              needsAuth: true 
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Create a new Google Doc
        const createDocResponse = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Meeting Minutes: ${title}`,
          }),
        });

        if (!createDocResponse.ok) {
          const errorText = await createDocResponse.text();
          console.error('Failed to create Google Doc:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to create Google Doc' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const newDoc = await createDocResponse.json();
        const documentId = newDoc.documentId;
        const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

        // Add content to the document
        if (content) {
          const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  insertText: {
                    location: { index: 1 },
                    text: content,
                  },
                },
              ],
            }),
          });

          if (!updateResponse.ok) {
            console.error('Failed to add content to Google Doc:', await updateResponse.text());
          }
        }

        // Update the meeting minute record with Google Doc info
        if (minuteId) {
          const { error: updateError } = await supabase
            .from('gw_meeting_minutes')
            .update({
              google_doc_id: documentId,
              google_doc_url: documentUrl,
            })
            .eq('id', minuteId);

          if (updateError) {
            console.error('Failed to update meeting minute with Google Doc info:', updateError);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            documentId,
            documentUrl,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'get_url': {
        if (!minuteId) {
          return new Response(
            JSON.stringify({ error: 'Minute ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Get the Google Doc URL from the database
        const { data: minute, error } = await supabase
          .from('gw_meeting_minutes')
          .select('google_doc_url, google_doc_id')
          .eq('id', minuteId)
          .single();

        if (error || !minute) {
          return new Response(
            JSON.stringify({ error: 'Meeting minute not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            documentUrl: minute.google_doc_url,
            documentId: minute.google_doc_id,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'sync': {
        if (!minuteId) {
          return new Response(
            JSON.stringify({ error: 'Minute ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const accessToken = await getAccessToken();
        if (!accessToken) {
          return new Response(
            JSON.stringify({ 
              error: 'Google authentication required. Please authenticate first.',
              needsAuth: true 
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Get the meeting minute record
        const { data: minute, error } = await supabase
          .from('gw_meeting_minutes')
          .select('google_doc_id')
          .eq('id', minuteId)
          .single();

        if (error || !minute || !minute.google_doc_id) {
          return new Response(
            JSON.stringify({ error: 'Meeting minute or Google Doc not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Get content from Google Doc
        const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${minute.google_doc_id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!docResponse.ok) {
          console.error('Failed to fetch Google Doc:', await docResponse.text());
          return new Response(
            JSON.stringify({ error: 'Failed to fetch Google Doc content' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const doc = await docResponse.json();
        
        // Extract text content from the document
        let textContent = '';
        if (doc.body && doc.body.content) {
          for (const element of doc.body.content) {
            if (element.paragraph && element.paragraph.elements) {
              for (const paragraphElement of element.paragraph.elements) {
                if (paragraphElement.textRun) {
                  textContent += paragraphElement.textRun.content;
                }
              }
            }
          }
        }

        // Update the discussion_points field with the Google Doc content
        const { error: updateError } = await supabase
          .from('gw_meeting_minutes')
          .update({
            discussion_points: textContent.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', minuteId);

        if (updateError) {
          console.error('Failed to update meeting minute with synced content:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to sync content to database' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            syncedContent: textContent.trim(),
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('Error in google-docs-manager function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});