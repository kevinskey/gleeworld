-- Add is_section_leader field to gw_profiles table
ALTER TABLE public.gw_profiles 
ADD COLUMN IF NOT EXISTS is_section_leader boolean DEFAULT false;