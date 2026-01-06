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
        <div className="py-12 sm:py-16 lg:py-20 bg-background pt-[20px]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-foreground mb-2 -mt-4 sm:text-lg">
                Our Course Offerings
              </h1>
              <div className="w-full flex items-center justify-center py-[5px]">
                <span className="text-[#1a1a2e] drop-shadow-[0_2px_4px_rgba(255,255,255,0.5)]">Spring 2026 Semester</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ACADEMY_COURSES.map(course => {
              const IconComponent = course.icon;
              return <Card key={course.id} className="group hover:shadow-xl transition-all duration-300 bg-card border border-border h-full flex flex-col cursor-pointer" onClick={() => handleCourseClick(course.route)}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <Badge variant="secondary" className="text-xs font-mono">
                            {course.courseCode}
                          </Badge>
                        </div>
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          {course.level}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold text-foreground">
                        {course.title}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">{course.duration}</span>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pt-0">
                      <p className="text-muted-foreground mb-6 text-sm pt-4">
                        {course.description}
                      </p>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground mb-2">Course Highlights:</h4>
                        <ul className="space-y-2">
                          {course.highlights.map((highlight, index) => <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{highlight}</span>
                            </li>)}
                        </ul>
                      </div>
                      
                      <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" size="default" onClick={e => {
                    e.stopPropagation();
                    handleCourseClick(course.route);
                  }}>
                        Enter {course.courseCode}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>;
            })}
            </div>
          </div>
        </div>

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