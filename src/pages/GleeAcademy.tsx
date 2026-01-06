import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import academyHeroImage from '@/assets/glee-world-academy-hero.jpg';
import { ACADEMY_COURSES } from '@/config/academyCourses';
const GleeAcademy = () => {
  const navigate = useNavigate();
  const handleCourseClick = (route: string) => {
    navigate(route);
  };
  return <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
      <div className="min-h-screen bg-background">
        {/* Hero Section - Horizontal Banner */}
        <div className="relative w-full bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] py-6 sm:py-8">
          <div className="container mx-auto px-4">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 mb-4" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="w-[80vw] mx-auto text-center">
            <h1 style={{
            fontSize: 'clamp(4rem, 18vw, 16rem)'
          }} className="font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] via-[#DAA520] to-[#B8860B] uppercase leading-none text-2xl">
              Glee Academy
            </h1>
          </div>
        </div>

        {/* Courses Section */}
        

        {/* Call to Action Section */}
        <div className="bg-muted/30 py-8 sm:py-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Begin Your Musical Journey?
            </h3>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join our community of musicians and experience the transformative power of music education rooted in excellence and tradition.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-sm sm:text-base" onClick={() => navigate('/booking')}>
                Apply Now
              </Button>
              <Button size="lg" variant="outline" className="text-sm sm:text-base border-2 border-primary text-primary hover:bg-primary hover:text-white" onClick={() => navigate('/booking')}>
                Schedule a Consultation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </UniversalLayout>;
};
export default GleeAcademy;