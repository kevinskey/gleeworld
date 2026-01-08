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

  const features = [
    {
      icon: Music,
      title: 'Expert Instruction',
      description: 'Learn from world-class musicians and educators'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Join a supportive community of fellow musicians'
    },
    {
      icon: Trophy,
      title: 'Excellence',
      description: 'Pursue the highest standards in choral music'
    },
    {
      icon: Calendar,
      title: 'Flexible Learning',
      description: 'Access course materials anytime, anywhere'
    }
  ];

  return (
    <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-6 text-black border-black">
                <GraduationCap className="w-4 h-4 mr-2" />
                Spelman College Glee Club
              </Badge>
              <h1 className="text-5xl md:text-7xl font-black text-black tracking-tight mb-6">
                GLEE ACADEMY
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Explore our comprehensive music education programs designed to nurture excellence in choral performance and musicianship.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-black text-white hover:bg-gray-800"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Browse Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-black text-black hover:bg-black hover:text-white"
                  onClick={() => navigate('/booking')}
                >
                  Schedule Consultation
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-6">
                  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-black text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Courses Section */}
        <div id="courses" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                Our Courses
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                From foundational skills to advanced techniques, find the perfect course for your musical journey.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {ACADEMY_COURSES.map((course) => (
                <Card 
                  key={course.id}
                  className="bg-white border border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleCourseClick(course.route, course.courseCode)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="font-mono text-xs border-gray-300 text-gray-600">
                        {course.courseCode}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          course.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                          course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {course.level}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-black group-hover:text-gray-700 transition-colors">
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
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-black transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-black py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Star className="h-12 w-12 text-white mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Begin Your Musical Journey?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                Join our community of musicians and experience the transformative power of music education rooted in excellence and tradition.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-black hover:bg-gray-100"
                  onClick={() => navigate('/booking')}
                >
                  Apply Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black"
                  onClick={() => navigate('/contact')}
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default GleeAcademy;
