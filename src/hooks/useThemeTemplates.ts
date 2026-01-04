/**
 * Hook to fetch theme templates from Supabase
 * This makes the database the authoritative source for theme definitions
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ThemeTemplate {
  id: string;
  name: string;
  description: string | null;
  
  // Colors (HSL format)
  color_primary: string;
  color_primary_foreground: string;
  color_secondary: string;
  color_secondary_foreground: string;
  color_accent: string;
  color_accent_foreground: string;
  color_background: string;
  color_foreground: string;
  color_card: string;
  color_card_foreground: string;
  color_muted: string;
  color_muted_foreground: string;
  color_border: string;
  color_destructive: string;
  color_destructive_foreground: string;
  
  // Typography
  font_family: string;
  font_heading: string | null;
  heading_shadow: string | null;
  
  // Background
  background_type: 'solid' | 'gradient' | 'image';
  background_value: string;
  
  // Display settings
  is_dark_theme: boolean;
  glass_effect: boolean;
  
  sort_order: number;
}

export function useThemeTemplates() {
  return useQuery({
    queryKey: ['theme-templates'],
    queryFn: async (): Promise<ThemeTemplate[]> => {
      const { data, error } = await supabase
        .from('theme_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('Error fetching theme templates:', error);
        throw error;
      }
      
      return (data || []) as ThemeTemplate[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour - themes rarely change
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });
}

export function useThemeTemplate(themeId: string | null) {
  const { data: themes, isLoading, error } = useThemeTemplates();
  
  const template = themes?.find(t => t.id === themeId) || themes?.[0] || null;
  
  return {
    template,
    isLoading,
    error,
  };
}
