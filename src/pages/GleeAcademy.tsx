import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Music, Users, Calendar, Trophy, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AcademyCourseCard } from '@/components/academy/AcademyCourseCard';

const GleeAcademy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);

  useEffect(() => {
    const checkEnrollments = async () => {
      if (!user) {
        setEnrolledCourses([]);
        return;
      }

      setCheckingEnrollment(true);
      try {
        const { data, error } = await supabase
          .from('gw_course_enrollments')
          .select('course_id')
          .eq('user_id', user.id);

        if (!error && data) {
          setEnrolledCourses(data.map(e => e.course_id));
        }
      } catch (error) {
        console.error('Error checking enrollments:', error);
      } finally {
        setCheckingEnrollment(false);
      }
    };

    checkEnrollments();
  }, [user]);

  const handleCourseClick = (course: typeof ACADEMY_COURSES[0]) => {
    if (course.courseCode === 'MUS 000') {
      window.open('https://readmusic.gleeworld.org', '_blank');
      return;
    }

    const isEnrolled = enrolledCourses.includes(course.id);
    const courseSlug = course.courseCode.toLowerCase().replace(' ', '-');
    
    if (isEnrolled) {
      // Go to the course page
      navigate(course.route);
    } else {
      // Go to onboarding page
      navigate(`/academy/${courseSlug}/onboarding`);
    }
  };
  const features = [{
    icon: Music,
    title: 'Expert Instruction',
    description: 'Learn from world-class musicians and educators'
  }, {
    icon: Users,
    title: 'Community',
    description: 'Join a supportive community of fellow musicians'
  }, {
    icon: Trophy,
    title: 'Excellence',
    description: 'Pursue the highest standards in choral music'
  }, {
    icon: Calendar,
    title: 'Flexible Learning',
    description: 'Access course materials anytime, anywhere'
  }];
  return <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
      <div className="min-h-screen bg-white">
        {/* Header Banner */}
        <div 
          className="w-full py-4 sm:py-5 flex items-center justify-center"
          style={{ backgroundColor: '#003666' }}
        >
          <div className="container mx-auto px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center tracking-wide">
              Glee Academy
            </h1>
            <p className="text-white/70 text-center mt-1 text-xs sm:text-sm max-w-xl mx-auto">
              Find the perfect course for your musical journey.
            </p>
          </div>
        </div>

        {/* Courses Section */}
        <div id="courses" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {ACADEMY_COURSES.map(course => (
                <AcademyCourseCard
                  key={course.id}
                  course={course}
                  onEnter={handleCourseClick}
                  buttonText={enrolledCourses.includes(course.id) ? 'Continue' : 'Enter Course'}
                />
              ))}
              
              {/* Sight Singing Studio Ad - spans columns 2-3, next to Leadership Development */}
              <a 
                href="https://www.sightsingingstudio.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="md:col-span-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 rounded-xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow duration-200 flex flex-col items-center justify-center text-center min-h-[200px]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <Music className="h-6 w-6 text-purple-600" />
                  </div>
                  <span className="text-xl font-bold text-white">Sight Singing Studio</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                  Master sight singing, <span className="italic">one phrase at a time</span>
                </h3>
                <p className="text-white/90 text-base sm:text-lg mb-4 max-w-xl">
                  Practice sight reading with real notation, adjustable tempo, and progress tracking.
                </p>
                <Button 
                  className="bg-white text-purple-600 hover:bg-gray-100 rounded-full px-6"
                >
                  Get Started →
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: '#003666' }}>
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
    </UniversalLayout>;
};
export default GleeAcademy;