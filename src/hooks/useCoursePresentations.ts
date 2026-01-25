import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CoursePresentation {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  description?: string;
  display_order: number;
  created_at: string;
  thumbnail_url?: string;
}

interface UseCoursePresentationsReturn {
  presentations: CoursePresentation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch PowerPoint presentations for a course from the media library.
 * Looks for files with PPTX/PPT extensions that are tagged with the course code.
 */
export const useCoursePresentations = (courseCode: string): UseCoursePresentationsReturn => {
  const [presentations, setPresentations] = useState<CoursePresentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPresentations = useCallback(async () => {
    if (!courseCode) {
      setPresentations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Normalize course code for matching (e.g., "MUS 240" -> "mus240", "mus-240")
      const normalizedCode = courseCode.toLowerCase().replace(/\s+/g, '');
      const hyphenatedCode = courseCode.toLowerCase().replace(/\s+/g, '-');

      // Query media library for PPTX files
      // Look for files that:
      // 1. Have pptx/ppt in file_type OR file_url ends with .pptx/.ppt
      // 2. Have course code in tags, category, or title
      const { data, error: fetchError } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, description, created_at, tags, category')
        .or(`file_type.ilike.%ppt%,file_url.ilike.%.pptx,file_url.ilike.%.ppt`)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Filter for course-specific presentations
      const coursePresentations = (data || []).filter(item => {
        // Check if tags contain course code
        const tags = item.tags || [];
        const hasTagMatch = tags.some((tag: string) => {
          const normalizedTag = tag.toLowerCase().replace(/\s+/g, '');
          return normalizedTag.includes(normalizedCode) || 
                 normalizedTag.includes(hyphenatedCode) ||
                 normalizedTag === normalizedCode;
        });

        // Check if category matches
        const categoryMatch = item.category?.toLowerCase().replace(/\s+/g, '') === normalizedCode ||
                             item.category?.toLowerCase().replace(/\s+/g, '-') === hyphenatedCode;

        // Check if title contains course code
        const titleMatch = item.title?.toLowerCase().includes(normalizedCode) ||
                          item.title?.toLowerCase().includes(hyphenatedCode);

        return hasTagMatch || categoryMatch || titleMatch;
      });

      setPresentations(coursePresentations.map((item, index) => ({
        id: item.id,
        title: item.title || 'Untitled Presentation',
        file_url: item.file_url,
        file_type: item.file_type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        description: item.description || undefined,
        display_order: index,
        created_at: item.created_at,
        thumbnail_url: undefined,
      })));

    } catch (err) {
      console.error('Error fetching course presentations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load presentations');
    } finally {
      setLoading(false);
    }
  }, [courseCode]);

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  return {
    presentations,
    loading,
    error,
    refetch: fetchPresentations,
  };
};
