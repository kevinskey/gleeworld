-- Create function to increment likes on buckets of love messages
CREATE OR REPLACE FUNCTION increment_love_message_likes(message_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_likes_count integer;
BEGIN
  UPDATE gw_buckets_of_love 
  SET likes = likes + 1
  WHERE id = message_id_param
  RETURNING likes INTO new_likes_count;
  
  RETURN new_likes_count;
END;
$$;