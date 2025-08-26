import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, BookOpen, Play, Users, Clock, Star, ChevronRight, Download } from "lucide-react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";

const MusicTheoryFundamentals = () => {
  const modules = [
    {
      title: "Introduction to Music Theory",
      description: "Basic concepts, notation, and musical alphabet",
      duration: "45 min",
      level: "Beginner"
    },
    {
      title: "Intervals and Scales",
      description: "Understanding musical distances and scale construction",
      duration: "60 min",
      level: "Beginner"
    },
    {
      title: "Chord Construction",
      description: "Building triads, seventh chords, and extensions",
      duration: "75 min",
      level: "Intermediate"
    },
    {
      title: "Harmonic Progressions",
      description: "Common chord progressions and voice leading",
      duration: "90 min",
      level: "Intermediate"
    },
    {
      title: "Advanced Harmonic Analysis",
      description: "Roman numeral analysis and functional harmony",
      duration: "120 min",
      level: "Advanced"
    }
  ];

  const resources = [
    { name: "Course Syllabus", type: "PDF" },
    { name: "Practice Exercises", type: "PDF" },
    { name: "Audio Examples", type: "MP3" },
    { name: "Reference Charts", type: "PDF" }
  ];

  return (
    <UniversalLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
          <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Music className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Music Theory Fundamentals
              </h1>
              <p className="mt-4 text-xl text-muted-foreground max-w-3xl mx-auto">
                Master the building blocks of music with comprehensive lessons from
              </p>
              <p className="text-2xl font-semibold text-primary mt-2">
                Dr. Kevin P. Johnson
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="px-8">
                  <Play className="h-5 w-5 mr-2" />
                  Start Learning
                </Button>
                <Button variant="outline" size="lg" className="px-8">
                  <BookOpen className="h-5 w-5 mr-2" />
                  View Syllabus
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Course Overview */}
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <Card className="text-center">
              <CardHeader>
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle>Expert Instruction</CardTitle>
                <CardDescription>
                  Learn from Dr. Kevin P. Johnson, renowned music educator and theorist
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle>Self-Paced Learning</CardTitle>
                <CardDescription>
                  Progress through modules at your own speed with lifetime access
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle>Comprehensive Content</CardTitle>
                <CardDescription>
                  From basics to advanced concepts with practical applications
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Course Modules */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Course Modules</h2>
            <div className="space-y-4">
              {modules.map((module, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-primary">
                            Module {index + 1}
                          </span>
                          <Badge variant={
                            module.level === "Beginner" ? "secondary" :
                            module.level === "Intermediate" ? "default" : "destructive"
                          }>
                            {module.level}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{module.title}</h3>
                        <p className="text-muted-foreground mb-2">{module.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {module.duration}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* About the Instructor */}
          <div className="mb-16">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">About Dr. Kevin P. Johnson</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground mb-4">
                      Dr. Kevin P. Johnson is a distinguished music educator and theorist with over 20 years of experience 
                      in higher education. He holds a Ph.D. in Music Theory from Yale University and has published extensively 
                      on topics ranging from harmonic analysis to pedagogical approaches in music education.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      As the Director of Music Theory at Spelman College, Dr. Johnson has developed innovative curricula 
                      that make complex theoretical concepts accessible to students at all levels. His teaching philosophy 
                      emphasizes practical application and cultural relevance in music theory education.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Yale University Ph.D.</Badge>
                      <Badge variant="outline">20+ Years Teaching</Badge>
                      <Badge variant="outline">Published Researcher</Badge>
                      <Badge variant="outline">Spelman College Faculty</Badge>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                      <Music className="h-16 w-16 text-primary" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Resources */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Course Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {resources.map((resource, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{resource.name}</p>
                        <p className="text-sm text-muted-foreground">{resource.type}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">Ready to Begin Your Musical Journey?</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Join hundreds of students who have transformed their understanding of music through 
                  Dr. Johnson's comprehensive theory course.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="px-8">
                    <Play className="h-5 w-5 mr-2" />
                    Enroll Now
                  </Button>
                  <Button variant="outline" size="lg" className="px-8">
                    Free Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default MusicTheoryFundamentals;