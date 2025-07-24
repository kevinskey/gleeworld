-- PHASE 2: Fix Function Search Path Issues (Batch 1 - Most Critical Functions)

-- Update all critical database functions to have proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_notifications()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND role = 'super-admin'
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND role = 'admin'
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_has_budget_permission(budget_id_param uuid, permission_type_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.budget_permissions
    WHERE budget_id = budget_id_param 
    AND user_id = auth.uid() 
    AND permission_type = permission_type_param
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_can_view_budget(budget_id_param uuid, created_by_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'view')
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_can_edit_budget(budget_id_param uuid, created_by_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;