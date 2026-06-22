// Read which add-ons are enabled for a course, and the catalog of all
// addons. The catalog matches the slugs in CourseAddonsPage so toggling
// there shows up here as enabled tabs in CourseShell.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Plane, QrCode, Youtube, ListMusic, FileText, Music, Mic, Shirt, Ticket,
  Heart, Brain, Sparkles, LibraryBig, Megaphone, Award, Newspaper,
} from 'lucide-react';

export type AddonSlug =
  | 'tour-manager' | 'qr-attendance' | 'polls'
  | 'wardrobe'
  | 'ai-grading' | 'ai-hub'
  | 'student-practice';

export interface AddonRow {
  addon_slug: string;
  is_enabled: boolean;
  config: any;
}

export interface AddonCatalogEntry {
  slug: AddonSlug;
  label: string;
  Icon: React.ElementType;
}

export const ADDON_CATALOG: AddonCatalogEntry[] = [
  { slug: 'tour-manager',    label: 'Tour',          Icon: Plane },
  { slug: 'qr-attendance',   label: 'QR Check-in',   Icon: QrCode },
  { slug: 'polls',           label: 'Polls',         Icon: ListMusic },
  { slug: 'wardrobe',        label: 'Wardrobe',      Icon: Shirt },
  { slug: 'ai-grading',      label: 'AI Grading',    Icon: Brain },
  { slug: 'ai-hub',          label: 'AI Hub',        Icon: Sparkles },
  { slug: 'student-practice',label: 'Practice',      Icon: Mic },
];

export function useCourseAddons(courseId?: string) {
  return useQuery<AddonRow[]>({
    queryKey: ['course-addons', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_course_addons')
        .select('addon_slug, is_enabled, config')
        .eq('course_id', courseId!);
      if (error) throw error;
      return (data ?? []) as AddonRow[];
    },
  });
}

// Resolve which add-on tabs are enabled, preserving catalog order so the
// left rail renders deterministically regardless of toggle history.
export function useEnabledAddonTabs(courseId?: string): AddonCatalogEntry[] {
  const { data: rows = [] } = useCourseAddons(courseId);
  const enabledSlugs = new Set(
    rows.filter((r) => r.is_enabled).map((r) => r.addon_slug as AddonSlug),
  );
  return ADDON_CATALOG.filter((a) => enabledSlugs.has(a.slug));
}
