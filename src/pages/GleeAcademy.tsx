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
      <div className="min-h-screen bg-background">
        {/* Header Banner - Matching other pages */}
        <div className="w-full py-6" style={{ backgroundColor: '#003666' }}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center tracking-wide">
            GLEE ACADEMY
          </h1>
        </div>

        {/* Intro Section */}
        <div className="bg-background py-12 border-b border-border">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <p className="text-lg md:text-xl text-muted-foreground mb-6">
              Explore our comprehensive music education programs designed to nurture excellence in choral performance and musicianship.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Browse Courses
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/book-appointment')}
              >
                Schedule Consultation
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-muted/50 py-16 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-6 bg-background rounded-lg shadow-sm">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Courses Section */}
        <div id="courses" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Courses
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From foundational skills to advanced techniques, find the perfect course for your musical journey.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {ACADEMY_COURSES.map((course) => (
                <Card 
                  key={course.id}
                  className="bg-card border border-border hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleCourseClick(course.route, course.courseCode)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {course.courseCode}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          course.level === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}
                      >
                        {course.level}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{course.instructor.name}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-primary to-primary/80 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Star className="h-12 w-12 text-primary-foreground mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Begin Your Musical Journey?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Join our community of musicians and experience the transformative power of music education rooted in excellence and tradition.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-gray-100"
                  onClick={() => navigate('/booking')}
                >
                  Apply Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-primary"
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
