import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, BookOpen, Mic, Eye, Crown, ChevronRight, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleProps } from '@/types/unified-modules';
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
  id: 'mus-210',
  title: 'MUS 210: Conducting for the Complete Musician',
  description: 'Comprehensive course in choral conducting covering baton technique, score analysis, and diverse choral traditions.',
  icon: Music,
  level: 'Advanced',
  duration: '16 weeks',
  highlights: ['Baton Technique', 'Score Study', 'Rehearsal Pedagogy', 'Stylistic Fluency']
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

export const GleeAcademyModule = ({ user, isFullPage = false }: ModuleProps) => {
  const navigate = useNavigate();
  
  const handleCourseClick = (courseId: string) => {
    if (courseId === 'african-american-music') {
      navigate('/classes/mus240');
    } else if (courseId === 'music-fundamentals') {
      navigate('/music-theory-fundamentals');
    } else if (courseId === 'private-lessons') {
      navigate('/booking');
    } else if (courseId === 'choral-conducting') {
      navigate('/choral-conducting-literature');
    } else if (courseId === 'mus-210') {
      navigate('/mus-210');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 -m-6 p-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden mb-8 max-h-48 flex items-center justify-center">
        <img 
          src={academyHeroImage} 
          alt="Glee World Academy" 
          className="max-w-2xl h-full object-contain rounded-lg mx-auto"
        />
      </div>

      {/* Courses Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Course Offerings
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const IconComponent = course.icon;
            const isClickable = course.id === 'african-american-music' || course.id === 'music-fundamentals' || course.id === 'private-lessons' || course.id === 'choral-conducting' || course.id === 'mus-210';
            return (
              <Card 
                key={course.id} 
                className={`group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col relative ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                onClick={isClickable ? () => handleCourseClick(course.id) : undefined}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {course.level}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{course.duration}</span>
                  </div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors leading-tight">
                    {course.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0">
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {course.description}
                  </p>
                  
                  <div className="space-y-3 flex-1 flex flex-col">
                    <h4 className="font-medium text-sm text-foreground">Course Highlights:</h4>
                    <ul className="space-y-1 flex-1">
                      {course.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ChevronRight className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full mt-4 group-hover:bg-primary/90 transition-colors text-sm" 
                      size="sm"
                      onClick={isClickable ? (e) => { e.stopPropagation(); handleCourseClick(course.id); } : undefined}
                    >
                      {course.id === 'african-american-music' ? 'Enter MUS 240' : 
                       course.id === 'music-fundamentals' ? 'Enter Music Theory' :
                       course.id === 'private-lessons' ? 'Book with Doc' :
                       course.id === 'choral-conducting' ? 'Enter Course' : 
                       course.id === 'mus-210' ? 'Enter MUS 210' : 'Under Development'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-muted/30 py-12 px-6 mt-12 rounded-lg">
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
