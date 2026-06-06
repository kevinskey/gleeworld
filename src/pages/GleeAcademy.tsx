import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Music, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMergedProfile } from '@/hooks/useMergedProfile';
import officeHoursBadge from '@/assets/office-hours-badge.png';
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
  const {
    user
  } = useAuth();
  const {
    firstName
  } = useMergedProfile(user);
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [badges, setBadges] = useState<CourseBadge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  // Fetch badges from database
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('academy_course_badges').select('*').eq('is_active', true).order('display_order', {
          ascending: true
        });
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
        const {
          data,
          error
        } = await supabase.from('gw_course_enrollments').select('course_id').eq('user_id', user.id).not('course_id', 'is', null);
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
  return <PublicLayout>
      <div className="min-h-screen bg-[#1a3a5c]">
        {/* Header Banner */}
        <div className="w-full py-6 sm:py-8 flex items-center justify-center" style={{
        backgroundColor: '#150d26'
      }}>
          <div className="container mx-auto px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center tracking-wide" style={{
            fontFamily: "'Cinzel', serif"
          }}>
              Glee Academy
            </h1>
            <p className="text-white/70 text-center mt-2 text-sm sm:text-base max-w-xl mx-auto">
              Find the perfect course for your musical journey.
            </p>
          </div>
        </div>

        {/* Course Badges Grid */}
        <div className="w-full bg-[#1a3a5c] py-8 sm:py-12 px-6 sm:px-12 lg:px-16">
          {loadingBadges ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-white/10 animate-pulse rounded-xl" />)}
            </div> : badges.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8 justify-items-center">
          {badges.filter(badge => !badge.badge_image_url?.includes('office-hours-badge')).map(badge => {
            const imgSrc = badge.badge_image_url;
            return <div key={badge.id} onClick={() => handleBadgeClick(badge)} className="cursor-pointer transition-all duration-300 hover:scale-105 flex items-center justify-center">
                    {imgSrc ? <img src={imgSrc} alt={`${badge.course_code} - ${badge.course_title}`} className="w-full h-auto max-h-64 object-contain drop-shadow-2xl hover:brightness-110 mx-auto rounded-2xl" /> : <div className="aspect-square w-full bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex flex-col items-center justify-center p-4 hover:bg-white/20">
                        <span className="text-white font-bold text-xl sm:text-2xl">{badge.course_code}</span>
                        <span className="text-white/80 text-sm text-center mt-2 line-clamp-2">{badge.course_title}</span>
                        <span className="text-amber-400 text-sm mt-3 font-medium">Enter Course →</span>
                      </div>}
                  </div>;
          })}
            </div> : <div className="text-white/60 text-center py-8 w-full">
              No course badges available.
            </div>}
        </div>

        {/* CTA Section */}
        
      </div>
    </PublicLayout>;
};
export default GleeAcademy;