-- First, let's see what services table exists
-- We'll rename gw_appointment_types to gw_appointment_services and enhance it
-- Drop the old services table if it exists
DROP TABLE IF EXISTS public.services CASCADE;

-- Rename appointment types to appointment services and add missing fields
ALTER TABLE public.gw_appointment_types RENAME TO gw_appointment_services;

-- Add the missing fields that were in services but not in appointment types
ALTER TABLE public.gw_appointment_services 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS instructor TEXT,
ADD COLUMN IF NOT EXISTS price_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_display TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS capacity_min INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS capacity_max INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS badge_text TEXT,
ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT '#6366F1',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS booking_buffer_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update any existing appointment references to use the new table name
-- This will be handled in the code updates