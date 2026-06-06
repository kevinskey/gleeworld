import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserById } from '@/hooks/useUserById';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AuditionerDashboard } from '@/components/member-view/dashboards/AuditionerDashboard';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { HeroSlider } from '@/components/hero/HeroSlider';
import { useUniversalHeroSlides } from '@/hooks/useUniversalSlider';

const AuditionerDashboardPage = () => {
  const { user, loading } = useAuth();
  const { user: profile, loading: profileLoading } = useUserById(user?.id);

  useEffect(() => {
    document.title = 'GleeWorld Auditions | Your favorite band or choir';
  }, []);

  if (loading || (user && profileLoading)) {
    return (
      <PublicLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <LoadingSpinner text="Loading Auditioner Dashboard..." />
        </div>
      </PublicLayout>
    );
  }

  // If not logged in, render a public-friendly dashboard with a guest auditioner context
  const guestAuditioner = {
    id: 'guest',
    email: '',
    full_name: 'Prospective Student',
    role: 'auditioner',
    created_at: new Date().toISOString(),
  } as any;

  return (
    <PublicLayout>
      <AuditionerHeroSlot />
      <AuditionerDashboard user={(profile as any) || guestAuditioner} />
    </PublicLayout>
  );
};

// Renders the audition-landing hero from the universal slider system.
// Admins manage slides at the universal slider admin under the
// "auditioner_landing_hero" placement_key.
const AuditionerHeroSlot = () => {
  const { data: slides = [] } = useUniversalHeroSlides('auditioner_landing_hero');
  if (slides.length === 0) return null;
  return (
    <div className="container mx-auto px-4 pt-6">
      <div className="rounded-lg overflow-hidden border border-border shadow-md aspect-[16/8]">
        <HeroSlider slides={slides} autoplay={true} showControls={false} showProgress={false} showPausePlay={false} />
      </div>
    </div>
  );
};

export default AuditionerDashboardPage;
