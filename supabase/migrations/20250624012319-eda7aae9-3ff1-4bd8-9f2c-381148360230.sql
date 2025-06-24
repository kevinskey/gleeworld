
-- Create a function to delete a user and all their associated data
CREATE OR REPLACE FUNCTION public.delete_user_and_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin or super-admin
    IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Permission denied: Only admins can delete users';
    END IF;
    
    -- Prevent self-deletion
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;
    
    -- Delete user data in order (respecting foreign key constraints)
    -- Delete W9 forms
    DELETE FROM public.w9_forms WHERE user_id = target_user_id;
    
    -- Delete contract signatures
    DELETE FROM public.contract_signatures WHERE user_id = target_user_id OR admin_id = target_user_id;
    DELETE FROM public.contract_signatures_v2 WHERE contract_id IN (
        SELECT id FROM public.generated_contracts WHERE created_by = target_user_id
    );
    
    -- Delete contract assignments
    DELETE FROM public.contract_user_assignments WHERE user_id = target_user_id;
    DELETE FROM public.singer_contract_assignments WHERE singer_id = target_user_id;
    
    -- Delete contracts created by user
    DELETE FROM public.generated_contracts WHERE created_by = target_user_id;
    DELETE FROM public.contracts WHERE created_by = target_user_id;
    DELETE FROM public.contracts_v2 WHERE created_by = target_user_id;
    DELETE FROM public.contract_documents WHERE created_by = target_user_id;
    
    -- Delete events created by user
    DELETE FROM public.events WHERE created_by = target_user_id;
    
    -- Delete contract templates created by user
    DELETE FROM public.contract_templates WHERE created_by = target_user_id;
    
    -- Delete performer records
    DELETE FROM public.performers WHERE user_id = target_user_id;
    
    -- Delete activity logs
    DELETE FROM public.activity_logs WHERE user_id = target_user_id;
    
    -- Delete admin notifications
    DELETE FROM public.admin_notifications WHERE admin_id = target_user_id;
    
    -- Delete user roles
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- Delete profile
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    -- Note: We cannot delete from auth.users table directly from this function
    -- The auth.users deletion will need to be handled by the edge function
    
    RETURN TRUE;
END;
$$;
