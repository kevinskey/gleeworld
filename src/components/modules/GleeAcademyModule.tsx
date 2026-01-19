import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ModuleProps } from '@/types/unified-modules';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { AcademyCourseCard } from '@/components/academy/AcademyCourseCard';
import { AcademyCourse } from '@/config/academyCourses';

export const GleeAcademyModule = ({ user, isFullPage = false }: ModuleProps) => {
  const navigate = useNavigate();
  
  const handleCourseClick = (course: AcademyCourse) => {
    navigate(course.route);
  };

  return (
    <div className="min-h-screen -m-6">
      {/* Hero Section - Horizontal Banner */}
      <div className="relative w-full bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] py-6 sm:py-8 mb-8">
        <div className="w-[80vw] mx-auto text-center">
          <h1 
            className="font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] via-[#DAA520] to-[#B8860B] uppercase leading-none"
            style={{ fontSize: 'clamp(4rem, 18vw, 16rem)' }}
          >
            Glee Academy
          </h1>
        </div>
      </div>

      {/* Courses Section */}
      <div className="px-6 pb-6">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Course Offerings
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 auto-rows-fr">
            {ACADEMY_COURSES.filter(course => course.isActive).map(course => (
              <AcademyCourseCard
                key={course.id}
                course={course}
                onEnter={handleCourseClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-muted/30 py-12 px-6 mt-12 rounded-lg mx-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to Begin Your Musical Journey?
          </h3>
          <p className="text-base lg:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community of musicians and experience the transformative power of music education rooted in excellence and tradition.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              onClick={() => navigate('/booking')}
            >
              Apply Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-primary text-primary hover:bg-primary hover:text-white"
              onClick={() => navigate('/booking')}
            >
              Schedule a Consultation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
