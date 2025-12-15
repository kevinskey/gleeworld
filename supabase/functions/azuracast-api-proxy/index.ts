import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AzuraCastRequest {
  endpoint: string;
  method?: string;
  body?: any;
  stationId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AzuraCast Proxy: Request received:', req.method, req.url);

    // Get the AzuraCast API key from secrets
    const azuracastApiKey = Deno.env.get('AZURACAST_API_KEY');
    if (!azuracastApiKey) {
      console.error('AzuraCast Proxy: API key not configured');
      return new Response(
        JSON.stringify({ error: 'AzuraCast API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role for admin verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('AzuraCast Proxy: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('AzuraCast Proxy: Auth verification failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify user has admin or exec board permissions
    const { data: profile } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin, is_exec_board')
      .eq('user_id', user.id)
      .single();

    const hasPermission = profile?.is_admin || profile?.is_super_admin || profile?.is_exec_board;
    
    if (!hasPermission) {
      console.error('AzuraCast Proxy: User does not have required permissions. Profile:', profile);
      return new Response(
        JSON.stringify({ error: 'Admin or Exec Board permissions required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('AzuraCast Proxy: User authorized:', { userId: user.id, isAdmin: profile?.is_admin, isSuperAdmin: profile?.is_super_admin, isExecBoard: profile?.is_exec_board });

    // Parse request data
    const requestData: AzuraCastRequest = await req.json();
    console.log('AzuraCast Proxy: Request data:', requestData);

    const { endpoint, method = 'GET', body, stationId = 'glee_world_radio' } = requestData;

    // Build AzuraCast API URL
    const baseUrl = 'https://radio.gleeworld.org';
    let apiUrl = `${baseUrl}/api`;
    
    if (endpoint.startsWith('/')) {
      apiUrl += endpoint;
    } else {
      apiUrl += `/${endpoint}`;
    }

    // Replace {stationId} placeholder if present
    apiUrl = apiUrl.replace('{stationId}', stationId);

    console.log('AzuraCast Proxy: Making request to:', apiUrl);

    // Prepare headers for AzuraCast API
    const azuracastHeaders: Record<string, string> = {
      'Authorization': `Bearer ${azuracastApiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'GleeWorld-Admin/1.0'
    };

    // Make request to AzuraCast API
    const azuracastResponse = await fetch(apiUrl, {
      method,
      headers: azuracastHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('AzuraCast Proxy: Response status:', azuracastResponse.status);

    // Handle AzuraCast response
    if (!azuracastResponse.ok) {
      const errorText = await azuracastResponse.text();
      console.error('AzuraCast Proxy: API error:', azuracastResponse.status, errorText);
      
      // For DELETE operations - 404 means already deleted (OK)
      // For GET operations with StationUnsupportedException - return empty
      // For POST operations - report actual errors so we know assignment failed
      const isDeleteOperation = method === 'DELETE';
      const isGetOperation = method === 'GET';
      const is404Or405 = azuracastResponse.status === 404 || azuracastResponse.status === 405;
      const isUnsupportedException = errorText.includes('StationUnsupportedException') || 
                                      errorText.includes('HttpMethodNotAllowedException');
      
      // Handle 405 Method Not Allowed for POST operations (e.g., queue disabled)
      if (azuracastResponse.status === 405 && isUnsupportedException) {
        console.log('AzuraCast Proxy: Method not allowed for:', method, endpoint);
        return new Response(
          JSON.stringify({ 
            error: 'Feature not enabled on radio station',
            details: 'This operation is not available. The queue/request feature may be disabled in AzuraCast station settings.',
            success: false
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Only mask errors gracefully for DELETE (already deleted) or unsupported GET features
      if ((isDeleteOperation && is404Or405) || 
          (isGetOperation && isUnsupportedException)) {
        console.log('AzuraCast Proxy: Returning graceful response for:', method, azuracastResponse.status);
        
        const responseBody = isGetOperation 
          ? [] 
          : { success: true, message: 'Resource already removed' };
        
        return new Response(
          JSON.stringify(responseBody),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // For POST/PUT errors (like playlist assignment), return actual error
      console.error('AzuraCast Proxy: Returning error for', method, 'operation');
      return new Response(
        JSON.stringify({ 
          error: `AzuraCast API error: ${azuracastResponse.status}`,
          details: errorText,
          success: false
        }),
        { 
          status: azuracastResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse and return successful response
    const responseData = await azuracastResponse.json();
    console.log('AzuraCast Proxy: Success, data size:', JSON.stringify(responseData).length);

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('AzuraCast Proxy: Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});