-- Seed existing alumnae landing page content into alumnae_content table
INSERT INTO public.alumnae_content (content_type, title, content, is_active, display_order, created_by) VALUES
  (
    'landing_page_hero',
    'Spelman College Glee Club Alumnae, Still Amazing, Still Inspiring!',
    'Welcome back, Keep on singing in my ear. #SCGC4Life',
    true,
    1,
    (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)
  ),
  (
    'welcome_message',
    'A Message from Doc Johnson',
    'As you navigate this portal, remember that your voice - whether in song or in life - continues to inspire and amaze. The legacy you built here extends far beyond these walls, and we are honored to celebrate your continued journey.',
    true,
    1,
    (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)
  ),
  (
    'announcement',
    'Homecoming 2024 Weekend',
    'Join us for our annual Homecoming Weekend celebration. Special performances, alumni gatherings, and memory sharing sessions planned.',
    true,
    1,
    (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)
  ),
  (
    'announcement', 
    'Mentor Circle Program',
    'We are expanding our mentorship program! Sign up to mentor current students and share your professional expertise.',
    true,
    2,
    (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)
  ),
  (
    'portal_banner',
    'Memory Wall Project',
    'Share your favorite Glee Club memories and photos for our digital memory wall. Your stories inspire current and future members.',
    true,
    1,
    (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)
  );