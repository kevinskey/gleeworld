-- Extend gw_profiles table for alumnae portal
ALTER TABLE public.gw_profiles 
ADD COLUMN IF NOT EXISTS voice_part text,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS bio text;

-- Create alumnae_audio_stories table
CREATE TABLE IF NOT EXISTS public.alumnae_audio_stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    graduation_year integer,
    audio_url text NOT NULL,
    duration_seconds integer,
    tags text[] DEFAULT '{}',
    is_approved boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.gw_alumnae_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    notification_type text DEFAULT 'general' CHECK (notification_type IN ('general', 'reunion', 'mentoring', 'system')),
    is_active boolean DEFAULT true,
    target_audience text DEFAULT 'all' CHECK (target_audience IN ('all', 'mentors', 'decade_specific', 'voice_part')),
    target_filter jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create alumnae_messages table
CREATE TABLE IF NOT EXISTS public.alumnae_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    visible_to text DEFAULT 'current_members' CHECK (visible_to IN ('current_members', 'public', 'alumnae_only')),
    is_approved boolean DEFAULT false,
    recipient_type text DEFAULT 'all' CHECK (recipient_type IN ('all', 'current_members', 'specific_class')),
    target_graduation_year integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create glee_history table for "On This Day" content
CREATE TABLE IF NOT EXISTS public.glee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    event_date date NOT NULL,
    year_occurred integer NOT NULL,
    category text DEFAULT 'performance' CHECK (category IN ('performance', 'milestone', 'achievement', 'tradition', 'alumni_news')),
    image_url text,
    is_featured boolean DEFAULT false,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create audio_archive table
CREATE TABLE IF NOT EXISTS public.audio_archive (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    audio_url text NOT NULL,
    duration_seconds integer,
    artist_info text,
    performance_date date,
    performance_location text,
    category text DEFAULT 'performance' CHECK (category IN ('performance', 'rehearsal', 'interview', 'historical')),
    is_public boolean DEFAULT true,
    play_count integer DEFAULT 0,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add tags column to gw_events if it doesn't exist
ALTER TABLE public.gw_events 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Enable RLS on all new tables
ALTER TABLE public.alumnae_audio_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_alumnae_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_archive ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alumnae_audio_stories
CREATE POLICY "Verified alumnae can create audio stories" ON public.alumnae_audio_stories
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND role = 'alumna' AND verified = true
        )
    );

CREATE POLICY "Anyone can view approved audio stories" ON public.alumnae_audio_stories
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can update their own audio stories" ON public.alumnae_audio_stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all audio stories" ON public.alumnae_audio_stories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        )
    );

-- RLS Policies for notifications
CREATE POLICY "Everyone can view active notifications" ON public.gw_alumnae_notifications
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage notifications" ON public.gw_alumnae_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        )
    );

-- RLS Policies for alumnae_messages
CREATE POLICY "Verified alumnae can create messages" ON public.alumnae_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND role = 'alumna' AND verified = true
        )
    );

CREATE POLICY "Anyone can view approved messages" ON public.alumnae_messages
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Admins can manage all messages" ON public.alumnae_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        )
    );

-- RLS Policies for glee_history
CREATE POLICY "Everyone can view glee history" ON public.glee_history
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage glee history" ON public.glee_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        )
    );

-- RLS Policies for audio_archive
CREATE POLICY "Everyone can view public audio archive" ON public.audio_archive
    FOR SELECT USING (is_public = true);

CREATE POLICY "Verified alumnae can view all audio archive" ON public.audio_archive
    FOR SELECT USING (
        is_public = true OR
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND role = 'alumna' AND verified = true
        )
    );

CREATE POLICY "Admins can manage audio archive" ON public.audio_archive
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('story-audio', 'story-audio', true),
    ('alumni-headshots', 'alumni-headshots', true),
    ('glee-soundtrack', 'glee-soundtrack', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for story-audio bucket
CREATE POLICY "Verified alumnae can upload audio stories" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'story-audio' AND
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND role = 'alumna' AND verified = true
        )
    );

CREATE POLICY "Anyone can view audio stories" ON storage.objects
    FOR SELECT USING (bucket_id = 'story-audio');

-- Storage policies for alumni-headshots bucket
CREATE POLICY "Verified alumnae can upload headshots" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'alumni-headshots' AND
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND role = 'alumna' AND verified = true
        )
    );

CREATE POLICY "Anyone can view headshots" ON storage.objects
    FOR SELECT USING (bucket_id = 'alumni-headshots');

-- Storage policies for glee-soundtrack bucket
CREATE POLICY "Anyone can view soundtrack" ON storage.objects
    FOR SELECT USING (bucket_id = 'glee-soundtrack');

CREATE POLICY "Admins can manage soundtrack" ON storage.objects
    FOR ALL USING (
        bucket_id = 'glee-soundtrack' AND
        EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gw_profiles_role_verified ON public.gw_profiles(role, verified);
CREATE INDEX IF NOT EXISTS idx_gw_profiles_graduation_year ON public.gw_profiles(graduation_year);
CREATE INDEX IF NOT EXISTS idx_gw_profiles_voice_part ON public.gw_profiles(voice_part);
CREATE INDEX IF NOT EXISTS idx_alumnae_audio_stories_approved ON public.alumnae_audio_stories(is_approved);
CREATE INDEX IF NOT EXISTS idx_glee_history_date ON public.glee_history(event_date);
CREATE INDEX IF NOT EXISTS idx_audio_archive_category ON public.audio_archive(category, is_public);

-- Create function to get decade from graduation year
CREATE OR REPLACE FUNCTION public.get_graduation_decade(grad_year integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN grad_year IS NULL THEN 'Unknown'
        ELSE (grad_year / 10 * 10)::text || 's'
    END;
$$;

-- Create function to get "On This Day" content
CREATE OR REPLACE FUNCTION public.get_on_this_day_content(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    year_occurred integer,
    years_ago integer,
    category text,
    image_url text
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        gh.id,
        gh.title,
        gh.description,
        gh.year_occurred,
        EXTRACT(YEAR FROM target_date)::integer - gh.year_occurred as years_ago,
        gh.category,
        gh.image_url
    FROM public.glee_history gh
    WHERE EXTRACT(MONTH FROM gh.event_date) = EXTRACT(MONTH FROM target_date)
      AND EXTRACT(DAY FROM gh.event_date) = EXTRACT(DAY FROM target_date)
    ORDER BY gh.year_occurred DESC;
$$;

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alumnae_audio_stories_updated_at
    BEFORE UPDATE ON public.alumnae_audio_stories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gw_alumnae_notifications_updated_at
    BEFORE UPDATE ON public.gw_alumnae_notifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_alumnae_messages_updated_at
    BEFORE UPDATE ON public.alumnae_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_glee_history_updated_at
    BEFORE UPDATE ON public.glee_history
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_audio_archive_updated_at
    BEFORE UPDATE ON public.audio_archive
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();