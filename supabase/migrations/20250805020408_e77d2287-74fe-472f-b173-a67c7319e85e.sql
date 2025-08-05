-- CRITICAL SECURITY FIX: Add secure bulk role update function with proper authorization
CREATE OR REPLACE FUNCTION public.secure_bulk_update_user_roles(
    target_user_ids UUID[],
    new_role TEXT,
    reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_role TEXT;
    admin_user_id UUID;
    updated_count INTEGER := 0;
    user_id UUID;
    old_role TEXT;
    errors TEXT[] := '{}';
    result JSONB;
BEGIN
    -- Get current user making the change
    admin_user_id := auth.uid();
    
    -- Verify current user is admin or super-admin
    SELECT role INTO current_user_role 
    FROM public.gw_profiles 
    WHERE user_id = admin_user_id;
    
    IF current_user_role IS NULL OR current_user_role NOT IN ('admin', 'super-admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Only admins can update user roles',
            'updated_count', 0
        );
    END IF;
    
    -- CRITICAL: Prevent self-role modification
    IF admin_user_id = ANY(target_user_ids) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Security violation: Cannot modify your own role',
            'updated_count', 0
        );
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('admin', 'user', 'super-admin', 'member', 'alumna', 'fan', 'executive') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid role: ' || new_role,
            'updated_count', 0
        );
    END IF;
    
    -- Only super-admins can assign super-admin role
    IF new_role = 'super-admin' AND current_user_role != 'super-admin' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Only super-admins can assign super-admin role',
            'updated_count', 0
        );
    END IF;
    
    -- Process each user
    FOREACH user_id IN ARRAY target_user_ids
    LOOP
        BEGIN
            -- Get old role for audit
            SELECT role INTO old_role 
            FROM public.gw_profiles 
            WHERE user_id = user_id;
            
            -- Update the role
            UPDATE public.gw_profiles 
            SET role = new_role, updated_at = now()
            WHERE user_id = user_id;
            
            -- Log security event for each role change
            PERFORM public.log_security_event(
                'role_changed',
                'user',
                user_id,
                jsonb_build_object(
                    'old_role', old_role,
                    'new_role', new_role,
                    'changed_by', admin_user_id,
                    'reason', reason,
                    'bulk_operation', true
                )
            );
            
            -- Log activity
            PERFORM public.log_activity(
                admin_user_id,
                'role_changed',
                'user_profile',
                user_id,
                jsonb_build_object(
                    'old_role', old_role,
                    'new_role', new_role,
                    'reason', reason,
                    'bulk_operation', true
                )
            );
            
            updated_count := updated_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            errors := array_append(errors, 'Failed to update user ' || user_id::text || ': ' || SQLERRM);
        END;
    END LOOP;
    
    -- Return results
    result := jsonb_build_object(
        'success', true,
        'updated_count', updated_count,
        'total_requested', array_length(target_user_ids, 1)
    );
    
    IF array_length(errors, 1) > 0 THEN
        result := result || jsonb_build_object('errors', to_jsonb(errors));
    END IF;
    
    RETURN result;
END;
$$;