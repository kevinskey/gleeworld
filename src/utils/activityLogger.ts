
import { supabase } from "@/integrations/supabase/client";

export interface LogActivityParams {
  actionType: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
}

export const logActivity = async ({
  actionType,
  resourceType,
  resourceId,
  details = {}
}: LogActivityParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No authenticated user found for activity logging');
      return;
    }

    // Get client IP and user agent (simplified for demo)
    const userAgent = navigator.userAgent;
    
    await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: actionType,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_details: details,
      p_ip_address: null, // Would need server-side implementation for real IP
      p_user_agent: userAgent
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

// Common activity types
export const ACTIVITY_TYPES = {
  // Contract activities
  CONTRACT_CREATED: 'contract_created',
  CONTRACT_UPDATED: 'contract_updated',
  CONTRACT_DELETED: 'contract_deleted',
  CONTRACT_SIGNED: 'contract_signed',
  CONTRACT_SENT: 'contract_sent',
  CONTRACT_VIEWED: 'contract_viewed',
  
  // Template activities
  TEMPLATE_CREATED: 'template_created',
  TEMPLATE_UPDATED: 'template_updated',
  TEMPLATE_DELETED: 'template_deleted',
  TEMPLATE_USED: 'template_used',
  
  // User activities
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  
  // Admin activities
  USER_ROLE_CHANGED: 'user_role_changed',
  USER_CREATED: 'user_created'
} as const;

export const RESOURCE_TYPES = {
  CONTRACT: 'contract',
  TEMPLATE: 'template',
  USER: 'user',
  SIGNATURE: 'signature'
} as const;
