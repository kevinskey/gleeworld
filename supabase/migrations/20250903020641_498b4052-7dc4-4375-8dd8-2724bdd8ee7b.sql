-- Reset all module access except hardcoded member modules
-- This will clear all explicit permissions, leaving only the hardcoded access to:
-- community-hub, music-library, calendar, attendance, check-in-check-out, member-sight-reading-studio

DELETE FROM public.username_permissions;