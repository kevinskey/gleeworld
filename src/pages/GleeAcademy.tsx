import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Music, BookOpen, Users, Mic, Eye, Crown, ChevronRight, GraduationCap, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    if (courseId === 'african-american-music') {
      navigate('/classes/mus240');
    } else if (courseId === 'music-fundamentals') {
      navigate('/music-theory-fundamentals');
    } else if (courseId === 'private-lessons') {
      navigate('/booking');
    }
  };

  return <UniversalLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-secondary py-16 px-6">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/20" />
          
          <div className="relative max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/20 backdrop-blur px-4 py-2 text-sm font-medium text-white mb-6">
              <Star className="h-4 w-4" />
              100+ Years of Musical Excellence
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 drop-shadow-lg">
              Glee Academy
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow-md">
              Elevate your musical journey with world-class instruction from the Spelman College Glee Club tradition
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg">
                Explore Courses
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Contact Us
              </Button>
            </div>
          </div>
        </div>

        {/* Courses Section */}
        <div className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Course Offerings
              </h2>
              
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => {
              const IconComponent = course.icon;
              const isClickable = course.id === 'african-american-music' || course.id === 'music-fundamentals' || course.id === 'private-lessons';
              return <Card 
                key={course.id} 
                className={`group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col relative ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                onClick={isClickable ? () => handleCourseClick(course.id) : undefined}
              >
                {!isClickable && (
                  <div className="absolute inset-0 z-10 flex items-end justify-start pointer-events-none overflow-hidden">
                    <div className="text-3xl font-bold text-muted-foreground/20 transform rotate-45 select-none whitespace-nowrap origin-bottom-left translate-x-8 -translate-y-4">
                      Under Development
                    </div>
                  </div>
                )}
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {course.level}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{course.duration}</span>
                      </div>
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {course.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                        {course.description}
                      </p>
                      
                      <div className="space-y-3 flex-1 flex flex-col">
                        <h4 className="font-medium text-sm text-foreground">Course Highlights:</h4>
                        <ul className="space-y-1 flex-1">
                          {course.highlights.map((highlight, index) => <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <ChevronRight className="h-3 w-3 text-primary flex-shrink-0" />
                              {highlight}
                            </li>)}
                        </ul>
                        
                        <Button 
                          className="w-full mt-4 group-hover:bg-primary/90 transition-colors" 
                          size="sm"
                          onClick={isClickable ? (e) => { e.stopPropagation(); handleCourseClick(course.id); } : undefined}
                        >
                          {course.id === 'african-american-music' ? 'Enter MUS 240' : 
                           course.id === 'music-fundamentals' ? 'Enter Music Theory' :
                           course.id === 'private-lessons' ? 'Book with Doc' : 'Learn More'}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>;
            })}
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="bg-muted/30 py-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Begin Your Musical Journey?
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join our community of musicians and experience the transformative power of music education rooted in excellence and tradition.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                Apply Now
              </Button>
              <Button size="lg" variant="outline">
                Schedule a Consultation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </UniversalLayout>;
};
export default GleeAcademy;