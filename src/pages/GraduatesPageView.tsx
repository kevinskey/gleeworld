import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GraduatesPageHero } from '@/components/graduates/GraduatesPageHero';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { getOrgName } from '@/lib/orgName';
export default function GraduatesPageView() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchPageContent();
  }, []);
  const fetchPageContent = async () => {
    try {
      const {
        data: sectionsData,
        error: sectionsError
      } = await supabase.from('alumnae_page_sections').select('*, alumnae_section_items(*)').eq('is_active', true).order('sort_order', {
        ascending: true
      });
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
      <UniversalLayout>
        <div className="flex-1 flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="Loading Graduates Portal..." />
        </div>
      </UniversalLayout>
    );
  }
  if (error) {
    return (
      <UniversalLayout>
        <div className="flex-1 container mx-auto px-4 py-20">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="text-destructive mb-4">Error loading page</div>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }
  if (sections.length === 0) {
    return (
      <UniversalLayout>
        <div className="flex-1 container mx-auto px-4 py-20">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-12 pb-12 text-center">
              <GraduationCap className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-bold mb-4">Welcome to the Graduates Portal</h1>
              <p className="text-lg text-muted-foreground mb-6">
                This page is currently being built. Please check back soon!
              </p>
              <p className="text-sm text-muted-foreground">
                Administrators can manage this page content from the{' '}
                <a href="/graduates-management" className="text-primary underline">
                  Page Builder
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }
  return (
    <UniversalLayout containerized={false}>
      {/* Welcome Header */}
      <div className="w-full py-6 md:py-8 bg-primary">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-4xl font-display text-white text-center tracking-wide">
            Welcome {getOrgName()} Graduate
          </h1>
        </div>
      </div>

      <GraduatesPageHero />

      <div className="flex-1 w-full" />
    </UniversalLayout>
  );
}
