-- Fix security definer view issue by removing the problematic view
-- This addresses the critical security warning about SECURITY DEFINER views
DROP VIEW IF EXISTS public.view_user_profiles CASCADE;