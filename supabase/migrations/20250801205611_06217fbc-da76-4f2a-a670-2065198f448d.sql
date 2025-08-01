-- Create table to track individual user likes
CREATE TABLE gw_buckets_of_love_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES gw_buckets_of_love(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE gw_buckets_of_love_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all likes" ON gw_buckets_of_love_likes FOR SELECT USING (true);
CREATE POLICY "Users can create their own likes" ON gw_buckets_of_love_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON gw_buckets_of_love_likes FOR DELETE USING (auth.uid() = user_id);

-- Update the increment function to handle proper like/unlike logic
CREATE OR REPLACE FUNCTION toggle_love_message_like(message_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  like_exists boolean;
  new_likes_count integer;
  user_liked boolean;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user already liked this message
  SELECT EXISTS(
    SELECT 1 FROM gw_buckets_of_love_likes 
    WHERE user_id = current_user_id AND message_id = message_id_param
  ) INTO like_exists;
  
  IF like_exists THEN
    -- Unlike: remove like and decrement counter
    DELETE FROM gw_buckets_of_love_likes 
    WHERE user_id = current_user_id AND message_id = message_id_param;
    
    UPDATE gw_buckets_of_love 
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = message_id_param
    RETURNING likes INTO new_likes_count;
    
    user_liked := false;
  ELSE
    -- Like: add like and increment counter
    INSERT INTO gw_buckets_of_love_likes (user_id, message_id)
    VALUES (current_user_id, message_id_param);
    
    UPDATE gw_buckets_of_love 
    SET likes = likes + 1
    WHERE id = message_id_param
    RETURNING likes INTO new_likes_count;
    
    user_liked := true;
  END IF;
  
  RETURN jsonb_build_object(
    'likes_count', new_likes_count,
    'user_liked', user_liked
  );
END;
$$;