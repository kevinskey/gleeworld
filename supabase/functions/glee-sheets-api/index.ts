import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle OAuth callback (no auth required)
  if (req.url.includes('/callback')) {
    return await handleOAuthCallback(req);
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'create_sheet':
        return await createSheet(supabaseClient, user.id, params);
      case 'update_sheet':
        return await updateSheet(supabaseClient, user.id, params);
      case 'sync_data':
        return await syncData(supabaseClient, user.id, params);
      case 'get_auth_url':
        return await getAuthUrl(supabaseClient, user.id);
      case 'check_auth':
        return await checkAuth(supabaseClient, user.id);
      case 'list_sheets':
        return await listSheets(supabaseClient, user.id);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in glee-sheets-api:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createSheet(supabaseClient: any, userId: string, params: any) {
  const { name, description, template_type, sheet_config } = params;

  // Check if user has Google Sheets authentication
  const { data: authData } = await supabaseClient
    .from('google_auth_tokens')
    .select('access_token, refresh_token, scopes')
    .eq('user_id', userId)
    .single();

  if (!authData || !authData.access_token) {
    return new Response(
      JSON.stringify({ needsAuth: true, message: 'Google authentication required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create Google Sheet using Sheets API
  const spreadsheetData = {
    properties: {
      title: name,
    },
    sheets: [{
      properties: {
        title: 'Ledger Data',
        gridProperties: {
          rowCount: 1000,
          columnCount: 20
        }
      }
    }]
  };

  const sheetsResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(spreadsheetData)
  });

  if (!sheetsResponse.ok) {
    throw new Error('Failed to create Google Sheet');
  }

  const sheetData = await sheetsResponse.json();

  // Add headers to the sheet
  const headers = ['Date', 'Description', 'Type', 'Amount', 'Balance', 'Category', 'Reference'];
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetData.spreadsheetId}/values/Ledger Data!A1:G1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [headers]
    })
  });

  // Store sheet metadata in database
  const { data: dbSheet, error } = await supabaseClient
    .from('glee_ledger_sheets')
    .insert({
      name,
      description,
      google_sheet_id: sheetData.spreadsheetId,
      google_sheet_url: sheetData.spreadsheetUrl,
      template_type,
      sheet_config: sheet_config || {},
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ 
      sheet: dbSheet,
      googleSheet: sheetData,
      success: true 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateSheet(supabaseClient: any, userId: string, params: any) {
  const { sheetId, data } = params;

  // Get sheet info
  const { data: sheet } = await supabaseClient
    .from('glee_ledger_sheets')
    .select('*')
    .eq('id', sheetId)
    .eq('created_by', userId)
    .single();

  if (!sheet) {
    throw new Error('Sheet not found or access denied');
  }

  // Get auth token
  const { data: authData } = await supabaseClient
    .from('google_auth_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (!authData) {
    throw new Error('Google authentication required');
  }

  // Update Google Sheet
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheet.google_sheet_id}/values/Ledger Data!A2:G1000?valueInputOption=RAW`, 
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: data
      })
    }
  );

  if (!updateResponse.ok) {
    throw new Error('Failed to update Google Sheet');
  }

  // Update sync timestamp
  await supabaseClient
    .from('glee_ledger_sheets')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', sheetId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncData(supabaseClient: any, userId: string, params: any) {
  const { sheetId } = params;

  // Get running ledger data from database
  const { data: ledgerData } = await supabaseClient
    .from('gw_running_ledger')
    .select('*')
    .order('entry_date', { ascending: true });

  if (!ledgerData) {
    throw new Error('No ledger data found');
  }

  // Convert to sheet format
  const sheetRows = ledgerData.map((entry: any) => [
    entry.entry_date,
    entry.description,
    entry.transaction_type,
    entry.amount,
    entry.running_balance,
    entry.category || '',
    entry.reference || ''
  ]);

  // Update the sheet
  return await updateSheet(supabaseClient, userId, { sheetId, data: sheetRows });
}

async function getAuthUrl(supabaseClient: any, userId: string) {
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  
  if (!googleClientId) {
    return new Response(
      JSON.stringify({ 
        error: 'Google Client ID not configured',
        note: 'Please configure GOOGLE_CLIENT_ID in Supabase secrets'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // Use the direct Supabase URL for the redirect
  const redirectUri = `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/glee-sheets-api/callback`;
  
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${googleClientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${userId}`;

  console.log('Generated OAuth URL:', authUrl);
  console.log('Redirect URI:', redirectUri);
  console.log('Google Client ID present:', !!googleClientId);

  return new Response(
    JSON.stringify({ 
      authUrl,
      redirectUri: redirectUri,
      note: "Configure this exact redirect URI in Google Cloud Console: " + redirectUri
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkAuth(supabaseClient: any, userId: string) {
  const { data: authData } = await supabaseClient
    .from('google_auth_tokens')
    .select('access_token, refresh_token, scopes')
    .eq('user_id', userId)
    .single();

  const hasAuth = !!(authData && authData.access_token);
  
  return new Response(
    JSON.stringify({ 
      hasAuth,
      needsAuth: !hasAuth,
      message: hasAuth ? 'Google Sheets authentication is active' : 'Google Sheets authentication required'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listSheets(supabaseClient: any, userId: string) {
  const { data: sheets, error } = await supabaseClient
    .from('glee_ledger_sheets')
    .select('*')
    .eq('created_by', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ sheets }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleOAuthCallback(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // This is the user ID
  const error = url.searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return new Response(`<html><body><h1>Authentication Error</h1><p>${error}</p><script>window.close();</script></body></html>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (!code || !state) {
    return new Response('<html><body><h1>Authentication Error</h1><p>Missing authorization code or state</p><script>window.close();</script></body></html>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/glee-sheets-api/callback`
      })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    // Create Supabase client for server operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store tokens in database
    const { error: dbError } = await supabaseClient
      .from('google_auth_tokens')
      .upsert({
        user_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
      });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    return new Response(`
      <html>
        <body>
          <h1>Authentication Successful!</h1>
          <p>Google Sheets integration is now enabled. You can close this window.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    return new Response(`<html><body><h1>Authentication Error</h1><p>${error.message}</p><script>window.close();</script></body></html>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}