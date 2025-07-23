-- Fix RLS issues for tables that are missing policies

-- Enable RLS on tables that need it but may be missing
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Add policies for user_preferences table
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update existing alumnae stories policies to be more comprehensive
DROP POLICY IF EXISTS "Users can view approved stories" ON public.alumnae_stories;
CREATE POLICY "Everyone can view approved stories" ON public.alumnae_stories
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own stories" ON public.alumnae_stories
    FOR SELECT USING (auth.uid() = user_id);

-- Update bulletin posts policies
ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

-- Update gw_profiles table to ensure proper RLS
CREATE POLICY "Users can view verified alumnae profiles" ON public.gw_profiles
    FOR SELECT USING (verified = true AND role = 'alumna');

CREATE POLICY "Users can view their own profile" ON public.gw_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.gw_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Update functions to be more secure with search_path
CREATE OR REPLACE FUNCTION public.get_graduation_decade(grad_year integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE 
        WHEN grad_year IS NULL THEN 'Unknown'
        ELSE (grad_year / 10 * 10)::text || 's'
    END;
$$;

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
SECURITY DEFINER
SET search_path = public
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