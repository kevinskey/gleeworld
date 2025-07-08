-- Extend profiles table with detailed user information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workplace TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voice_part TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_dance BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instruments_played TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT;

-- Social media links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}'::jsonb;

-- Create an enum for voice parts
DO $$ BEGIN
    CREATE TYPE voice_part_enum AS ENUM ('S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create an enum for payment methods
DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('zelle', 'cashapp', 'venmo', 'apple_pay', 'check');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update voice_part column to use enum
ALTER TABLE public.profiles ALTER COLUMN voice_part TYPE voice_part_enum USING voice_part::voice_part_enum;

-- Update preferred_payment_method column to use enum
ALTER TABLE public.profiles ALTER COLUMN preferred_payment_method TYPE payment_method_enum USING preferred_payment_method::payment_method_enum;