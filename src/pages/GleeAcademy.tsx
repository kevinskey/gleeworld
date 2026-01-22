import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Music, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CourseBadge {
  id: string;
  course_code: string;
  course_title: string;
  badge_image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

const GleeAcademy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [badges, setBadges] = useState<CourseBadge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  // Fetch badges from database
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const { data, error } = await supabase
          .from('academy_course_badges')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setBadges(data || []);
      } catch (error) {
        console.error('Error fetching academy badges:', error);
      } finally {
        setLoadingBadges(false);
      }
    };
    fetchBadges();
  }, []);

  useEffect(() => {
    const checkEnrollments = async () => {
      if (!user) {
        setEnrolledCourses([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('gw_course_enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .not('course_id', 'is', null);
        if (!error && data) {
          setEnrolledCourses(data.map(e => e.course_id).filter(Boolean) as string[]);
        }
      } catch (error) {
        console.error('Error checking enrollments:', error);
      }
    };
    checkEnrollments();
  }, [user]);


  const handleBadgeClick = (badge: CourseBadge) => {
    if (badge.link_url) {
      navigate(badge.link_url);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#1a3a5c]">
        {/* Header Banner */}
        <div 
          className="w-full py-6 sm:py-8 flex items-center justify-center"
          style={{ backgroundColor: '#003666' }}
        >
          <div className="container mx-auto px-4">
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center tracking-wide"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Glee Academy
            </h1>
            <p className="text-white/70 text-center mt-2 text-sm sm:text-base max-w-xl mx-auto">
              Find the perfect course for your musical journey.
            </p>
          </div>
        </div>

        {/* Course Badges Grid */}
        <div className="w-full bg-[#1a3a5c] py-8 sm:py-12 px-6 sm:px-12 lg:px-16">
          {loadingBadges ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-white/10 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : badges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
              {badges.map(badge => (
                <div 
                  key={badge.id} 
                  onClick={() => handleBadgeClick(badge)}
                  className="cursor-pointer transition-all duration-300 hover:scale-105 flex items-center justify-center"
                >
                  {badge.badge_image_url ? (
                    <img 
                      src={badge.badge_image_url} 
                      alt={`${badge.course_code} - ${badge.course_title}`}
                      className="w-full h-auto max-h-64 object-contain drop-shadow-2xl hover:brightness-110"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex flex-col items-center justify-center p-4 hover:bg-white/20">
                      <span className="text-white font-bold text-xl sm:text-2xl">{badge.course_code}</span>
                      <span className="text-white/80 text-sm text-center mt-2 line-clamp-2">{badge.course_title}</span>
                      <span className="text-amber-400 text-sm mt-3 font-medium">Enter Course →</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-white/60 text-center py-8 w-full">
              No course badges available.
            </div>
          )}
        </div>

        {/* Sight Singing Studio Ad */}
        <div className="px-6 sm:px-16 pb-8">
          <a 
            href="https://www.sightsingingstudio.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 rounded-xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow duration-200 text-center"
          >
            <div className="flex items-center gap-3 mb-4 justify-center">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <Music className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xl font-bold text-white">Sight Singing Studio</span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              Master sight singing, <span className="italic">one phrase at a time</span>
            </h3>
            <p className="text-white/90 text-base sm:text-lg mb-4 max-w-xl mx-auto">
              Practice sight reading with real notation, adjustable tempo, and progress tracking.
            </p>
            <Button className="bg-purple-600 text-white hover:bg-purple-700 rounded-full px-6 border-2 border-white">
              Get Started →
            </Button>
          </a>
        </div>

        {/* CTA Section */}
        <div 
          className="py-12 sm:py-16 md:py-20"
          style={{ backgroundColor: '#003666' }}
        >
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="max-w-3xl mx-auto text-center">
              <Star className="h-10 w-10 sm:h-12 sm:w-12 text-white mx-auto mb-4 sm:mb-6" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                Ready to Begin Your Musical Journey?
              </h2>
              <p className="text-white/80 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
                Join our community of musicians and experience the transformative power of music education rooted in excellence and tradition.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-[#003666] hover:bg-gray-100" 
                  onClick={() => navigate('/booking')}
                >
                  Apply Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white hover:text-[#003666]" 
                  onClick={() => navigate('/contact')}
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default GleeAcademy;