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
          className="w-full py-6 sm:py-8 md:py-10 flex items-center justify-center"
          style={{ backgroundColor: '#003666' }}
        >
          <div className="container mx-auto px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center tracking-wide">
              Glee Academy
            </h1>
            <p className="text-white/80 text-center mt-2 text-sm sm:text-base max-w-2xl mx-auto">
              From foundational skills to advanced techniques, find the perfect course for your musical journey.
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
                  className="bg-white border border-gray-200 hover:border-[#003666] hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleCourseClick(course.route, course.courseCode)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="font-mono text-xs border-gray-300 text-gray-700">
                        {course.courseCode}
                      </Badge>
                      <Badge 
                        className={`text-xs ${
                          course.level === 'Beginner' 
                            ? 'bg-green-100 text-green-700' 
                            : course.level === 'Intermediate' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {course.level}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-[#003666] transition-colors">
                      {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{course.instructor.name}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#003666] transition-colors" />
                    </div>
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