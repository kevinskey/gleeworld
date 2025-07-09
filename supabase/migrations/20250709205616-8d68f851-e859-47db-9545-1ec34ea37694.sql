-- Phase 2A: E-commerce, Analytics, and Music Library Tables

-- E-commerce Tables
CREATE TABLE IF NOT EXISTS public.gw_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(10,2) not null default 0,
  compare_at_price numeric(10,2),
  product_type text default 'merchandise',
  vendor text,
  tags text[],
  is_active boolean default true,
  inventory_quantity integer default 0,
  track_inventory boolean default true,
  requires_shipping boolean default true,
  weight numeric(8,2),
  images text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.gw_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.gw_products(id) on delete cascade,
  title text not null,
  option1 text, -- size, color, etc
  option2 text,
  option3 text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  inventory_quantity integer default 0,
  sku text,
  barcode text,
  weight numeric(8,2),
  image_url text,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.gw_user_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.gw_profiles(id) on delete cascade,
  order_number text unique not null,
  status text default 'pending', -- pending, paid, shipped, delivered, cancelled
  payment_status text default 'pending',
  total_amount numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  tax_amount numeric(10,2) default 0,
  shipping_amount numeric(10,2) default 0,
  currency text default 'USD',
  shipping_address jsonb,
  billing_address jsonb,
  payment_method text,
  payment_id text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.gw_payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.gw_user_orders(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text default 'USD',
  payment_method text not null, -- stripe, square, etc
  payment_id text unique not null,
  status text default 'pending', -- pending, completed, failed, refunded
  transaction_data jsonb,
  created_at timestamp with time zone default now()
);

-- Music Analytics and Playlists
CREATE TABLE IF NOT EXISTS public.gw_playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references public.gw_profiles(id),
  is_public boolean default false,
  cover_image_url text,
  total_duration integer default 0, -- in seconds
  track_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.gw_playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references public.gw_playlists(id) on delete cascade,
  music_file_id uuid references public.gw_music_files(id) on delete cascade,
  position integer not null,
  added_by uuid references public.gw_profiles(id),
  added_at timestamp with time zone default now(),
  unique(playlist_id, music_file_id)
);

CREATE TABLE IF NOT EXISTS public.gw_music_analytics (
  id uuid primary key default gen_random_uuid(),
  music_file_id uuid references public.gw_music_files(id) on delete cascade,
  user_id uuid references public.gw_profiles(id),
  event_type text not null, -- play, pause, skip, complete
  play_duration integer, -- seconds played
  timestamp_played timestamp with time zone default now(),
  session_id text,
  device_info jsonb,
  location_info jsonb
);

-- Sheet Music and Scores
CREATE TABLE IF NOT EXISTS public.gw_sheet_music (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  composer text,
  arranger text,
  key_signature text,
  time_signature text,
  tempo_marking text,
  difficulty_level text, -- beginner, intermediate, advanced
  voice_parts text[], -- soprano, alto, tenor, bass
  language text default 'English',
  pdf_url text,
  audio_preview_url text,
  thumbnail_url text,
  tags text[],
  is_public boolean default false,
  created_by uuid references public.gw_profiles(id),
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.gw_scores (
  id uuid primary key default gen_random_uuid(),
  sheet_music_id uuid references public.gw_sheet_music(id) on delete cascade,
  user_id uuid references public.gw_profiles(id) on delete cascade,
  score_value integer not null, -- 0-100
  max_score integer default 100,
  performance_date timestamp with time zone,
  notes text,
  recorded_by uuid references public.gw_profiles(id),
  created_at timestamp with time zone default now()
);

-- Recordings and Audio Processing
CREATE TABLE IF NOT EXISTS public.gw_recordings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  audio_url text not null,
  duration integer, -- in seconds
  file_size bigint,
  format text, -- mp3, wav, m4a
  quality text default 'standard',
  recorded_by uuid references public.gw_profiles(id),
  recording_date timestamp with time zone,
  associated_sheet_music_id uuid references public.gw_sheet_music(id),
  is_processed boolean default false,
  processing_status text default 'pending', -- pending, processing, completed, failed
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- News and Content Management
CREATE TABLE IF NOT EXISTS public.gw_news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  excerpt text,
  featured_image_url text,
  category text default 'general',
  tags text[],
  is_published boolean default false,
  is_featured boolean default false,
  publish_date timestamp with time zone,
  author_id uuid references public.gw_profiles(id),
  view_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- User Permissions and Roles
CREATE TABLE IF NOT EXISTS public.gw_permissions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  category text default 'general', -- general, admin, content, finance
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.gw_user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.gw_profiles(id) on delete cascade,
  permission_id uuid references public.gw_permissions(id) on delete cascade,
  granted_by uuid references public.gw_profiles(id),
  granted_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  unique(user_id, permission_id)
);

-- Enable RLS on new tables
DO $$ 
DECLARE 
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'gw_products', 'gw_product_variants', 'gw_user_orders', 'gw_payment_records',
            'gw_playlists', 'gw_playlist_tracks', 'gw_music_analytics', 
            'gw_sheet_music', 'gw_scores', 'gw_recordings', 'gw_news_items',
            'gw_permissions', 'gw_user_permissions'
        ])
    LOOP
        EXECUTE 'ALTER TABLE public.' || tbl || ' ENABLE ROW LEVEL SECURITY';
    END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Basic RLS Policies for new tables
-- Products - public viewing
DROP POLICY IF EXISTS "Public can view products" ON public.gw_products;
CREATE POLICY "Public can view products" ON public.gw_products
  FOR SELECT USING (is_active = true);

-- Orders - users can only see their own
DROP POLICY IF EXISTS "Users can view own orders" ON public.gw_user_orders;
CREATE POLICY "Users can view own orders" ON public.gw_user_orders
  FOR SELECT USING (auth.uid() = user_id);

-- Playlists - public playlists viewable by all
DROP POLICY IF EXISTS "Public can view public playlists" ON public.gw_playlists;
CREATE POLICY "Public can view public playlists" ON public.gw_playlists
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view own playlists" ON public.gw_playlists;
CREATE POLICY "Users can view own playlists" ON public.gw_playlists
  FOR SELECT USING (auth.uid() = created_by);

-- Sheet music - public viewable
DROP POLICY IF EXISTS "Public can view public sheet music" ON public.gw_sheet_music;
CREATE POLICY "Public can view public sheet music" ON public.gw_sheet_music
  FOR SELECT USING (is_public = true);

-- News - published news viewable by all
DROP POLICY IF EXISTS "Public can view published news" ON public.gw_news_items;
CREATE POLICY "Public can view published news" ON public.gw_news_items
  FOR SELECT USING (is_published = true AND (publish_date IS NULL OR publish_date <= now()));

-- Recordings - users can view their own
DROP POLICY IF EXISTS "Users can view own recordings" ON public.gw_recordings;
CREATE POLICY "Users can view own recordings" ON public.gw_recordings
  FOR SELECT USING (auth.uid() = recorded_by);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gw_products_active ON public.gw_products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gw_user_orders_user_id ON public.gw_user_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_user_orders_status ON public.gw_user_orders(status);
CREATE INDEX IF NOT EXISTS idx_gw_playlists_public ON public.gw_playlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_gw_music_analytics_music_file ON public.gw_music_analytics(music_file_id);
CREATE INDEX IF NOT EXISTS idx_gw_music_analytics_timestamp ON public.gw_music_analytics(timestamp_played);
CREATE INDEX IF NOT EXISTS idx_gw_news_published ON public.gw_news_items(is_published, publish_date) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_gw_sheet_music_public ON public.gw_sheet_music(is_public) WHERE is_public = true;