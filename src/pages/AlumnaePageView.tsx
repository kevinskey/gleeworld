import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { UniversalFooter } from '@/components/layout/UniversalFooter';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DynamicSection } from '@/components/alumnae/viewer/DynamicSection';
import { HeroSlideshow } from '@/components/alumnae/HeroSlideshow';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function AlumnaePageView() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UniversalHeader />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading Alumnae Portal..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <UniversalHeader />
        <div className="flex-1 container mx-auto px-4 py-20">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="text-destructive mb-4">Error loading page</div>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
        <UniversalFooter />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <UniversalHeader />
        <div className="flex-1 container mx-auto px-4 py-20">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-12 pb-12 text-center">
              <GraduationCap className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-bold mb-4">Welcome to the Alumnae Portal</h1>
              <p className="text-lg text-muted-foreground mb-6">
                This page is currently being built. Please check back soon!
              </p>
              <p className="text-sm text-muted-foreground">
                Administrators can manage this page content from the{' '}
                <a href="/alumnae-management" className="text-primary underline">
                  Page Builder
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
        <UniversalFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UniversalHeader />
      <HeroSlideshow />
      <div className="flex-1 w-full">
        {sections.map((section) => (
          <DynamicSection key={section.id} section={section} />
        ))}
      </div>
      <UniversalFooter />
    </div>
  );
}
