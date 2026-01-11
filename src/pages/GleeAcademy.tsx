import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ChevronRight, BookOpen, Users, Music, GraduationCap, Calendar, Trophy, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';
const GleeAcademy = () => {
  const navigate = useNavigate();
  const handleCourseClick = (route: string, courseCode?: string) => {
    if (courseCode === 'MUS 000') {
      window.open('https://readmusic.gleeworld.org', '_blank');
    } else {
      navigate(route);
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
        <div id="courses" className="py-12 md:py-16 lg:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {ACADEMY_COURSES.map(course => (
                <Card 
                  key={course.id} 
                  className="bg-white text-foreground border border-gray-200 hover:border-[#003666] hover:shadow-xl transition-all cursor-pointer group flex flex-col"
                  onClick={() => handleCourseClick(course.route, course.courseCode)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="font-mono text-xs border-[#003666] text-[#003666]">
                        {course.courseCode}
                      </Badge>
                      <Badge 
                        className={`text-xs font-medium ${
                          course.level === 'Beginner' 
                            ? 'bg-green-600 text-white' 
                            : course.level === 'Intermediate' 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-purple-600 text-white'
                        }`}
                      >
                        {course.level}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-bold text-[#003666] group-hover:text-[#002244] transition-colors leading-tight">
                      {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-foreground/80 text-sm md:text-base mb-4 flex-1 leading-relaxed">
                      {course.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{course.instructor.name}</span>
                    </div>
                    <Button 
                      className="w-full bg-[#003666] hover:bg-[#002244] text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseClick(course.route, course.courseCode);
                      }}
                    >
                      Enroll Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 md:py-20" style={{ backgroundColor: '#003666' }}>
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Star className="h-12 w-12 text-white mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Begin Your Musical Journey?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Join our community of musicians and experience the transformative power of music education rooted in excellence and tradition.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
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