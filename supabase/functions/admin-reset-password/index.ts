
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email?: string;
  userId?: string;
  newPassword: string;
}

// Enhanced password validation function with stronger security requirements
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Minimum length increased to 8 characters
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  // Maximum length to prevent DoS attacks
  if (password.length > 128) {
    errors.push("Password must be less than 128 characters long");
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  // Check for number
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  // Check for special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)");
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'admin', 'guest', 'user', 'qwerty',
    'password123', 'admin123', 'welcome', 'letmein', 'monkey',
    '12345678', 'password1', 'welcome123', 'administrator',
    'spelman', 'glee', 'gleeclub', 'college'
  ];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push("Password contains common patterns. Please choose a stronger password.");
  }
  
  // Check for sequential characters
  if (/123|abc|qwe|987|zyx/i.test(password)) {
    errors.push("Password cannot contain sequential characters like 123, abc, or qwe");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting for security
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const checkRateLimit = (identifier: string, maxRequests = 5, windowMs = 900000): boolean => {
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting with enhanced security
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP, 3, 900000)) { // More restrictive: 3 attempts per 15 minutes
      return new Response(JSON.stringify({
        error: "Rate limit exceeded for password reset operations"
      }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userId, email, newPassword }: ResetPasswordRequest = await req.json();

    // Enhanced password validation
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return new Response(JSON.stringify({
        error: "Password validation failed",
        details: passwordValidation.errors
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Prevent weak default passwords
    if (newPassword.toLowerCase() === 'spelman' || newPassword.toLowerCase() === 'password' || newPassword === '123456') {
      return new Response(JSON.stringify({
        error: "Password validation failed",
        details: ["Password is too common and insecure. Please use a stronger password."]
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Enhanced admin verification using secure function
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .rpc('verify_admin_access', { user_id_param: user.id });

    if (adminError || !adminCheck) {
      // Log the unauthorized attempt
      await supabaseAdmin.rpc('log_security_event', {
        p_action_type: 'unauthorized_admin_password_reset_attempt',
        p_resource_type: 'password_reset',
        p_resource_id: null,
        p_details: { 
          attempted_by: user.id,
          target_email: email,
          target_user_id: userId,
          client_ip: clientIP
        }
      });
      
      throw new Error("Insufficient admin privileges");
    }

    let targetUserId = userId;
    
    // If email is provided instead of userId, look up the user ID
    if (email && !userId) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) {
        throw new Error(`Failed to find user: ${userError.message}`);
      }
      
      const user = userData.users.find(u => u.email === email);
      
      // SECURITY FIX: Do not create users automatically - only reset existing users
      if (!user) {
        throw new Error(`User with email ${email} not found. User creation is not allowed through password reset function.`);
      }
      
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new Error('Either userId or email must be provided');
    }

    // Log the password reset action for security audit
    await supabaseAdmin.rpc('log_security_event', {
      p_action_type: 'admin_password_reset',
      p_resource_type: 'user_account',
      p_resource_id: targetUserId,
      p_details: { 
        performed_by: user.id,
        target_user_id: targetUserId,
        target_email: email,
        client_ip: clientIP
      }
    });

    // Update the user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
      user_metadata: {
        force_password_change: true,
        password_reset_by_admin: true,
        password_reset_at: new Date().toISOString()
      }
    });
    
    if (error) {
      throw error;
    }


    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
