
-- Phase 1: Core GleeWorld Tables Migration
-- User and Profile Management
CREATE TABLE public.gw_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'fan',
  avatar_url text,
  bio text,
  phone text,
  address text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE public.gw_fans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.gw_profiles(id) on delete cascade,
  fan_level text default 'basic',
  membership_date date default current_date,
  preferences jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- Content Management - Heroes
CREATE TABLE public.gw_hero_settings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  background_image_url text,
  overlay_opacity numeric default 0.5,
  text_color text default '#ffffff',
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE public.gw_hero_slides (
  id uuid primary key default gen_random_uuid(),
  hero_settings_id uuid references public.gw_hero_settings(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  link_url text,
  button_text text,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Music Management
CREATE TABLE public.gw_music_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  album text,
  genre text,
  duration integer, -- in seconds
  file_url text not null,
  file_size bigint,
  file_type text,
  uploaded_by uuid references public.gw_profiles(id),
  is_public boolean default false,
  play_count integer default 0,
  created_at timestamp with time zone default now()
);

CREATE TABLE public.gw_audio_files (
  id uuid primary key default gen_random_uuid(),
  music_file_id uuid references public.gw_music_files(id) on delete cascade,
  quality text default 'standard', -- standard, high, lossless
  bitrate integer,
  sample_rate integer,
  channels integer default 2,
  file_url text not null,
  created_at timestamp with time zone default now()
);

-- Video Management  
CREATE TABLE public.gw_youtube_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text unique not null,
  title text not null,
  description text,
  thumbnail_url text,
  duration integer,
  published_at timestamp with time zone,
  view_count bigint default 0,
  tags text[],
  category text,
  is_featured boolean default false,
  added_by uuid references public.gw_profiles(id),
  created_at timestamp with time zone default now()
);

-- Events and Calendar
CREATE TABLE public.gw_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text default 'performance', -- performance, rehearsal, meeting, etc
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  location text,
  venue_name text,
  address text,
  max_attendees integer,
  registration_required boolean default false,
  is_public boolean default true,
  status text default 'scheduled', -- scheduled, cancelled, completed
  created_by uuid references public.gw_profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE public.gw_event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.gw_events(id) on delete cascade,
  user_id uuid references public.gw_profiles(id) on delete cascade,
  status text default 'pending', -- pending, attending, not_attending
  response_date timestamp with time zone default now(),
  notes text,
  unique(event_id, user_id)
);

-- Announcements
CREATE TABLE public.gw_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  announcement_type text default 'general', -- general, urgent, event, news
  is_featured boolean default false,
  publish_date timestamp with time zone default now(),
  expire_date timestamp with time zone,
  created_by uuid references public.gw_profiles(id),
  target_audience text default 'all', -- all, fans, members
  created_at timestamp with time zone default now()
);

-- Site Settings
CREATE TABLE public.gw_site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text unique not null,
  setting_value text,
  setting_type text default 'text', -- text, number, boolean, json
  description text,
  is_public boolean default false,
  updated_by uuid references public.gw_profiles(id),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on all tables
ALTER TABLE public.gw_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_fans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_hero_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_music_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_site_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (will be refined based on your needs)
-- Profiles: Users can view their own profiles, admins can view all
CREATE POLICY "Users can view own profile" ON public.gw_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.gw_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
  );

-- Public content policies (events, announcements, etc.)
CREATE POLICY "Public can view public events" ON public.gw_events
  FOR SELECT USING (is_public = true);

CREATE POLICY "Public can view announcements" ON public.gw_announcements
  FOR SELECT USING (publish_date <= now() AND (expire_date IS NULL OR expire_date > now()));

-- Music files - public ones viewable by all
CREATE POLICY "Public can view public music" ON public.gw_music_files
  FOR SELECT USING (is_public = true);

-- Hero content - public viewable
CREATE POLICY "Public can view hero content" ON public.gw_hero_settings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view hero slides" ON public.gw_hero_slides
  FOR SELECT USING (is_active = true);

-- YouTube videos - public viewable
CREATE POLICY "Public can view youtube videos" ON public.gw_youtube_videos
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_gw_profiles_user_id ON public.gw_profiles(user_id);
CREATE INDEX idx_gw_events_start_date ON public.gw_events(start_date);
CREATE INDEX idx_gw_events_public ON public.gw_events(is_public) WHERE is_public = true;
CREATE INDEX idx_gw_music_files_public ON public.gw_music_files(is_public) WHERE is_public = true;
CREATE INDEX idx_gw_announcements_publish ON public.gw_announcements(publish_date);
