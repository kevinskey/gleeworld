import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DynamicSection } from '@/components/alumnae/viewer/DynamicSection';

export default function AlumnaePageView() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPageContent();
  }, []);

  const fetchPageContent = async () => {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('alumnae_page_sections')
        .select('*, alumnae_section_items(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      setSections(sectionsData || []);
    } catch (error: any) {
      console.error('Failed to load page:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="w-full">
        {sections.map((section) => (
          <DynamicSection key={section.id} section={section} />
        ))}
      </div>
    </PublicLayout>
  );
}
