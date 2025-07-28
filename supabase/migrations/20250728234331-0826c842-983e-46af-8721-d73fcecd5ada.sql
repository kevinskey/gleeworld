-- Fix security definer functions by adding proper SET search_path
CREATE OR REPLACE FUNCTION public.get_user_executive_position(user_id_param UUID)
RETURNS executive_position
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position 
  FROM public.gw_executive_board_members 
  WHERE user_id = user_id_param AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_executive_board_member(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = user_id_param AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.log_executive_board_action(
  p_action_type TEXT,
  p_action_description TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  user_position executive_position;
BEGIN
  -- Get user's position
  SELECT position INTO user_position
  FROM public.gw_executive_board_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  -- Insert log entry
  INSERT INTO public.gw_executive_board_progress_log (
    user_id,
    user_position,
    action_type,
    action_description,
    related_entity_type,
    related_entity_id,
    metadata
  ) VALUES (
    auth.uid(),
    user_position,
    p_action_type,
    p_action_description,
    p_related_entity_type,
    p_related_entity_id,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;