import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateTokenRequest {
  token: string;
  required_permissions?: string[];
}

// Rate limiting for security
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const checkRateLimit = (identifier: string, maxRequests = 100, windowMs = 900000): boolean => {
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
    const { token, required_permissions = [] }: ValidateTokenRequest = await req.json();

    console.log("Validating SSO token");

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: "Token is required"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify JWT token with secret key
    let tokenPayload;
    try {
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
      
      tokenPayload = await verify(token, key);
    } catch (verifyError) {
      console.error("Token verification error:", verifyError.message);
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid or tampered token"
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (tokenPayload.expires_at < currentTime) {
      console.log("Token expired:", {
        expires_at: tokenPayload.expires_at,
        current_time: currentTime
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: "Token has expired"
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check required permissions
    if (required_permissions.length > 0) {
      const userPermissions = tokenPayload.permissions || [];
      const hasAllPermissions = required_permissions.every(perm => 
        userPermissions.includes(perm)
      );

      if (!hasAllPermissions) {
        return new Response(JSON.stringify({
          success: false,
          error: "Insufficient permissions",
          required: required_permissions,
          user_permissions: userPermissions
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Token is valid - secure logging
    console.log("Token validated successfully for user ID:", tokenPayload.user_id?.substring(0, 8) + "...");

    return new Response(JSON.stringify({
      success: true,
      valid: true,
      user: {
        id: tokenPayload.user_id,
        profile_id: tokenPayload.profile_id,
        email: tokenPayload.email,
        full_name: tokenPayload.full_name,
        role: tokenPayload.role,
        permissions: tokenPayload.permissions || []
      },
      metadata: tokenPayload.metadata || {},
      expires_at: tokenPayload.expires_at
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in gw-validate-sso-token:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to validate SSO token'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);