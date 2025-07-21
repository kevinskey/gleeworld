-- Add new fields to profiles table for enhanced user profiles

-- Wardrobe & Identity fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dress_size TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shoe_size TEXT; 
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hair_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_tattoos BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS visible_piercings BOOLEAN DEFAULT false;

-- Academic & Personal fields  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_major TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_year INTEGER;

-- Health & Safety fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_guardian_contact TEXT;