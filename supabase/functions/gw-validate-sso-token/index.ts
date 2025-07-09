import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateTokenRequest {
  token: string;
  required_permissions?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Decode the token (in production, verify JWT signature)
    let tokenPayload;
    try {
      const decodedBytes = decode(token);
      const decodedString = new TextDecoder().decode(decodedBytes);
      tokenPayload = JSON.parse(decodedString);
    } catch (decodeError) {
      console.error("Token decode error:", decodeError);
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid token format"
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

    // Token is valid
    console.log("Token validated successfully for user:", tokenPayload.email);

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