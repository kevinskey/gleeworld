import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowRight, X, ChevronDown, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useCourseContext } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
export const GleeAcademyDashboardCard = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    profile
  } = useUserRole();
  const isAdmin = profile?.is_admin || profile?.is_super_admin;
  const {
    selectedCourseId,
    selectCourse,
    clearCourseSelection,
    isDefaultCourse
  } = useCourseContext();
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(true);
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

  // Get ALL active courses from config as fallback
  const activeCourses = useMemo(() => {
    return ACADEMY_COURSES.filter(course => course.isActive);
  }, []);

  // Always start the horizontal slider at the left
  useEffect(() => {
    if (sliderRef.current) sliderRef.current.scrollLeft = 0;
  }, [isOpen]);
  const handleCourseClick = (course: typeof ACADEMY_COURSES[0]) => {
    if (!user) {
      toast.error('Please log in to access courses');
      return;
    }
    // Navigate directly to the course home page
    navigate(course.route);
  };
  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 300;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  return <div className="w-full bg-[#1a3a5c] relative">
      {/* Navigation arrows - hidden on mobile */}
      <button onClick={() => scrollSlider('left')} className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full p-2 transition-colors">
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      <button onClick={() => scrollSlider('right')} className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full p-2 transition-colors">
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Photo Slider - Database badges */}
      <div ref={sliderRef} className="flex gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-12 snap-x snap-mandatory scroll-smooth py-[2px]" style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch'
    }}>
        {loadingBadges ? <div className="flex gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 sm:h-44 md:h-52 w-36 sm:w-48 bg-white/10 animate-pulse rounded-xl" />)}
          </div> : badges.length > 0 ? badges.map(badge => {
        // Resolve image URL - use local import for office hours badge
        const imgSrc = badge.badge_image_url?.includes('office-hours-badge') ? officeHoursBadge : badge.badge_image_url;
        return <div key={badge.id} onClick={() => badge.link_url ? navigate(badge.link_url) : null} className="flex-shrink-0 snap-center cursor-pointer transition-all duration-300 hover:scale-105">
                {imgSrc ? <img src={imgSrc} alt={`${badge.course_code} - ${badge.course_title}`} className="h-36 sm:h-52 md:h-60 w-auto object-contain drop-shadow-2xl hover:brightness-110 rounded-2xl" /> : <div className="h-36 sm:h-52 md:h-60 w-36 sm:w-52 md:w-60 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex flex-col items-center justify-center p-4 hover:bg-white/20">
                    <span className="text-white font-bold text-lg sm:text-xl">{badge.course_code}</span>
                    <span className="text-white/80 text-xs sm:text-sm text-center mt-2 line-clamp-2">{badge.course_title}</span>
                    <span className="text-amber-400 text-xs mt-3 font-medium">Enter Course →</span>
                  </div>}
              </div>;
      }) : <div className="text-white/60 text-center py-8 w-full">
            No course badges configured. Add them in Hero Manager → Academy Slider.
          </div>}
      </div>
    </div>;
};