import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { UniversalFooter } from '@/components/layout/UniversalFooter';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DynamicSection } from '@/components/alumnae/viewer/DynamicSection';
import { HeroSlideshow } from '@/components/alumnae/HeroSlideshow';
import { AlumnaeHero } from '@/components/alumnae/AlumnaeHero';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Music, Sparkles, Ticket } from 'lucide-react';
export default function AlumnaePageView() {
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
    return <div className="min-h-screen flex flex-col">
        <UniversalHeader />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading Alumnae Portal..." />
        </div>
      </div>;
  }
  if (error) {
    return <div className="min-h-screen flex flex-col">
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
      </div>;
  }
  if (sections.length === 0) {
    return <div className="min-h-screen flex flex-col">
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
      </div>;
  }
  return <div className="min-h-screen flex flex-col">
      <UniversalHeader />
      
      {/* Concert Ticket Request Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-spelman-blue via-primary to-brand-maroon">
        <div className="absolute inset-0 bg-[url('/images/themes/gleeworld-bg.jpg')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
        <div className="relative container mx-auto px-4 py-10 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-3 max-w-2xl">
              <Badge className="bg-white/20 text-white border-white/30 text-sm px-4 py-1">
                <Ticket className="h-4 w-4 mr-2" />
                Limited Availability
              </Badge>
              <h2 className="text-2xl md:text-4xl font-display text-white tracking-tight">
                Request 99th Annual Christmas Carol Concert Wristbands Here! 
              </h2>
              <p className="text-base md:text-lg text-white/90 leading-relaxed">
                Join us for an unforgettable evening of music and sisterhood. Reserve your seats for the upcoming Spelman College Glee Club performance.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button onClick={() => navigate('/concert-ticket-request')} size="lg" className="bg-white text-primary hover:bg-white/90 text-base md:text-lg px-6 py-5 h-auto shadow-xl">
                <Music className="h-5 w-5 mr-2" />
                Request Tickets Now
              </Button>
              <p className="text-white/70 text-sm">Maximum 2 tickets per request</p>
            </div>
          </div>
        </div>
      </div>

      <AlumnaeHero />
      <HeroSlideshow />
      <div className="flex-1 w-full">
        {sections.map(section => <DynamicSection key={section.id} section={section} />)}
      </div>
      <UniversalFooter />
    </div>;
}