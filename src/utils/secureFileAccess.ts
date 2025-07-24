// Secure file access utility for role-based file downloads
import { supabase } from "@/integrations/supabase/client";

interface SecureFileAccessOptions {
  bucketId: string;
  filePath: string;
  requiredRole?: string[];
  checkOwnership?: boolean;
}

export const getSecureFileUrl = async ({
  bucketId,
  filePath,
  requiredRole = [],
  checkOwnership = true
}: SecureFileAccessOptions): Promise<string | null> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return null;
    }

    // Check user profile and permissions
    const { data: profile, error: profileError } = await supabase
      .from('gw_profiles')
      .select('role, is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch user profile:', profileError);
      return null;
    }

    // Check if user has required role
    const isAdmin = profile.is_admin || profile.is_super_admin;
    const hasRequiredRole = requiredRole.length === 0 || 
      requiredRole.includes(profile.role) || 
      isAdmin;

    if (!hasRequiredRole) {
      console.error('Insufficient permissions for file access');
      return null;
    }

    // For user-files bucket, check ownership
    if (checkOwnership && bucketId === 'user-files') {
      const filePathParts = filePath.split('/');
      const fileUserId = filePathParts[0];
      
      if (fileUserId !== user.id && !isAdmin) {
        console.error('File ownership check failed');
        return null;
      }
    }

    // Generate signed URL for private files
    const { data, error } = await supabase.storage
      .from(bucketId)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Secure file access error:', error);
    return null;
  }
};

// Input sanitization utilities
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags and encode special characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Safe HTML rendering for user content
export const createSafeHTML = (content: string): string => {
  // Allow only safe HTML tags and attributes
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const allowedAttributes = ['class'];
  
  // Simple sanitization - in production, consider using DOMPurify
  let sanitized = content;
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized;
};

// Log security events
export const logSecurityEvent = async (
  actionType: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
) => {
  try {
    await supabase.rpc('log_security_event', {
      p_action_type: actionType,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_details: details || {},
      p_ip_address: null, // Would need to get from request
      p_user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};