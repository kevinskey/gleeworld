-- Create RPC function for inserting media library items
CREATE OR REPLACE FUNCTION public.insert_media_library_item(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_file_url TEXT,
  p_file_path TEXT,
  p_file_type TEXT,
  p_file_size BIGINT,
  p_category TEXT DEFAULT 'general',
  p_tags TEXT[] DEFAULT NULL,
  p_context TEXT DEFAULT 'general',
  p_uploaded_by UUID,
  p_is_public BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.gw_media_library (
    title, description, file_url, file_path, file_type, file_size,
    category, tags, context, uploaded_by, is_public
  )
  VALUES (
    p_title, p_description, p_file_url, p_file_path, p_file_type, p_file_size,
    p_category, p_tags, p_context, p_uploaded_by, p_is_public
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;