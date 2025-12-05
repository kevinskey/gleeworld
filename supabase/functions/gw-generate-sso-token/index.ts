import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SSOTokenRequest {
  user_id: string;
  target_app: string;
  expires_in?: number; // seconds, default 300 (5 minutes)
  permissions?: string[];
  metadata?: Record<string, any>;
}

// Rate limiting for security
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const checkRateLimit = (identifier: string, maxRequests = 10, windowMs = 900000): boolean => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, { count: 0, lastReset: now });
  }
  
  const limit = rateLimitMap.get(identifier)!;
  
  if (limit.lastReset < windowStart) {
    limit.count = 0;
    limit.lastReset = now;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Rate limit exceeded"
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { user_id, target_app, expires_in = 300, permissions = [], metadata = {} }: SSOTokenRequest = await req.json();

    console.log("Generating SSO token for:", { user_id, target_app, expires_in });

    // Verify user exists and get user info
    const { data: user, error: userError } = await supabaseClient
      .from('gw_profiles')
      .select('id, user_id, email, full_name, role')
      .eq('user_id', user_id)
      .single();

    if (userError || !user) {
      console.error("User not found:", userError);
      return new Response(JSON.stringify({
        success: false,
        error: "User not found"
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Create token payload
    const tokenPayload = {
      user_id: user.user_id,
      profile_id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      target_app,
      permissions,
      metadata,
      issued_at: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(Date.now() / 1000) + expires_in,
      issuer: 'gleeworld-sso'
    };

    // Create proper JWT token with secret key
    const jwtSecret = Deno.env.get('JWT_SECRET_KEY');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET_KEY not configured');
    }
    
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    const token = await create({ alg: "HS256", typ: "JWT" }, tokenPayload, key);

    // Secure logging without sensitive data
    console.log("SSO token generated for user ID:", user.user_id.substring(0, 8) + "...", {
      target_app,
      expires_at: new Date(tokenPayload.expires_at * 1000).toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      token,
      expires_at: tokenPayload.expires_at,
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in gw-generate-sso-token:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate SSO token'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);