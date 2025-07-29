-- First, let's update the user to be a chaplain so they can create spiritual reflections
UPDATE gw_profiles 
SET exec_board_role = 'chaplain' 
WHERE user_id = 'b4eaed0e-6fe7-4060-90d9-2d96a604f404';

-- Now create a test spiritual reflection
INSERT INTO gw_spiritual_reflections (
  title, 
  content, 
  reflection_type, 
  scripture_reference, 
  is_shared_to_members, 
  created_by,
  shared_at
) VALUES (
  'Daily Inspiration', 
  'Remember that every voice in our choir is precious and unique. Just as each note contributes to our beautiful harmonies, each member of our Glee Club family brings something special to our community. Let us continue to support one another as we grow in musical excellence and sisterhood.', 
  'daily_devotional', 
  'Psalms 100:1-2', 
  true, 
  'b4eaed0e-6fe7-4060-90d9-2d96a604f404',
  now()
);