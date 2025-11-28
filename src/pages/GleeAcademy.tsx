import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Music, BookOpen, Users, Mic, Eye, Crown, ChevronRight, GraduationCap, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import academyHeroImage from '@/assets/glee-world-academy-hero.jpg';

const courses = [{
  id: 'choral-conducting',
  title: 'Choral Conducting and Literature',
  description: 'Master the art of choral conducting with comprehensive training in technique, score analysis, and repertoire selection.',
  icon: Music,
  level: 'Advanced',
  duration: '16 weeks',
  highlights: ['Conducting Technique', 'Score Analysis', 'Rehearsal Planning', 'Repertoire Selection']
}, {
  id: 'african-american-music',
  title: 'Survey of African American Music',
  description: 'Explore the rich history and cultural impact of African American music from spirituals to contemporary genres.',
  icon: BookOpen,
  level: 'All Levels',
  duration: '12 weeks',
  highlights: ['Historical Context', 'Cultural Impact', 'Genre Evolution', 'Performance Practice']
}, {
  id: 'music-fundamentals',
  title: 'Music Fundamentals Theory',
  description: 'Build a solid foundation in music theory, notation, and harmonic analysis essential for all musicians.',
  icon: GraduationCap,
  level: 'Beginner',
  duration: '10 weeks',
  highlights: ['Music Notation', 'Scales & Modes', 'Chord Analysis', 'Rhythmic Patterns']
}, {
  id: 'private-lessons',
  title: 'Private Applied Lessons',
  description: 'One-on-one instruction tailored to your individual needs and musical goals with experienced faculty.',
  icon: Mic,
  level: 'All Levels',
  duration: 'Ongoing',
  highlights: ['Personalized Instruction', 'Technique Development', 'Performance Preparation', 'Goal Setting']
}, {
  id: 'sight-singing',
  title: 'Sight Singing Institute',
  description: 'Develop advanced sight-singing skills and musical literacy through systematic training and practice.',
  icon: Eye,
  level: 'Intermediate',
  duration: '8 weeks',
  highlights: ['Interval Recognition', 'Melodic Patterns', 'Rhythmic Reading', 'Harmonic Context']
}, {
  id: 'leadership-development',
  title: 'Leadership Development - Glee 101',
  description: 'Develop leadership skills specific to choral music, including mentorship, organization, and community building.',
  icon: Crown,
  level: 'All Levels',
  duration: '6 weeks',
  highlights: ['Leadership Skills', 'Mentorship Training', 'Team Building', 'Communication']
}];
const GleeAcademy = () => {
  const navigate = useNavigate();
  
  const handleCourseClick = (courseId: string) => {
    if (courseId === 'choral-conducting') {
      navigate('/mus-210');
    } else if (courseId === 'african-american-music') {
      navigate('/mus-240');
    } else if (courseId === 'music-fundamentals') {
      navigate('/mus-100');
    } else if (courseId === 'private-lessons') {
      navigate('/booking');
    }
  };

  return <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
    <div className="min-h-screen bg-background">
      {/* Hero Section with Academy Branding */}
      <div className="relative w-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] py-16 sm:py-24">
        <div className="container mx-auto px-4 text-center">
          <img 
            src={academyHeroImage} 
            alt="Glee Academy" 
            className="w-full max-w-xl mx-auto object-contain"
          />
        </div>
      </div>

      {/* Courses Section */}
      <div className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Our Course Offerings
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => {
              const IconComponent = course.icon;
              const isClickable = ['choral-conducting', 'african-american-music', 'music-fundamentals', 'private-lessons'].includes(course.id);
              return (
                <Card 
                  key={course.id} 
                  className={`group hover:shadow-xl transition-all duration-300 bg-card border border-border h-full flex flex-col ${isClickable ? 'cursor-pointer' : ''}`}
                  onClick={isClickable ? () => handleCourseClick(course.id) : undefined}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          {course.level}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{course.duration}</span>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col pt-0">
                    <p className="text-muted-foreground mb-6 text-sm">
                      {course.description}
                    </p>
                    
                    <div className="space-y-4 flex-1 flex flex-col">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-2">Course Highlights:</h4>
                        <ul className="space-y-2">
                          {course.highlights.map((highlight, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <Button 
                        className="w-full mt-auto bg-[#1a1a2e] hover:bg-[#16213e] text-white" 
                        size="default"
                        onClick={isClickable ? (e) => { e.stopPropagation(); handleCourseClick(course.id); } : undefined}
                        disabled={!isClickable}
                      >
                        {course.id === 'choral-conducting' ? 'View Course' :
                         course.id === 'african-american-music' ? 'Enter MUS 240' : 
                         course.id === 'music-fundamentals' ? 'Enter Music Theory' :
                         course.id === 'private-lessons' ? 'Book with Doc' : 'Under Development'}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
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
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-sm sm:text-base"
              onClick={() => navigate('/booking')}
            >
              Apply Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-sm sm:text-base border-2 border-primary text-primary hover:bg-primary hover:text-white"
              onClick={() => navigate('/booking')}
            >
              Schedule a Consultation
            </Button>
          </div>
        </div>
      </div>
    </div>
    </UniversalLayout>;
};
export default GleeAcademy;