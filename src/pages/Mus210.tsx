import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Calendar, 
  Users, 
  FileText, 
  Music,
  Home,
  Bell,
  FolderOpen,
  MessageSquare,
  GraduationCap,
  ClipboardList,
  BarChart3,
  Clock,
  HelpCircle,
  Video,
  Headphones,
  FileImage
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

export default function Mus210() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const courseId = 'mus-210-conducting';
  const { enrollment, isEnrolled, isLoading, enroll } = useCourseEnrollment(courseId);

  const [activeSection, setActiveSection] = useState('home');
  const [showObjectives, setShowObjectives] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth?tab=login');
      return;
    }
    await enroll();
  };

  const courseData = {
    courseCode: 'MUS 210',
    title: 'Conducting for the Complete Musician',
    credits: 2,
    meetingTimes: 'MW — 2× per week (50 min)',
    location: 'Fine Arts 109',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      officeHours: 'MWF 3–5 PM or appointment'
    },
    purpose: 'This course develops the complete modern conductor. Students gain baton technique, expressive gesture, score analysis methods, rehearsal pedagogy, and stylistic fluency across classical, spirituals, gospel, and contemporary choral traditions.',
    objectives: [
      'Demonstrate proper baton and expressive gesture technique.',
      'Conduct beat patterns in multiple meters and tempi.',
      'Employ advanced conducting techniques.',
      'Analyze choral scores for harmony, text, structure, and style.',
      'Conduct rehearsals in real ensemble settings.'
    ],
    requiredTexts: [
      { title: 'A Survey of Choral Music', author: 'Homer Ulrich' },
      { title: 'The Modern Conductor', author: 'Elizabeth Green & Mark Gibson' }
    ],
    requiredMaterials: ['Baton', 'Video recording device', 'Internet access', 'Pencil (No. 2)'],
    attendancePolicy: `Students may miss 2 classes without penalty. Each additional absence lowers the final grade by one letter.`,
    gradingBreakdown: [
      { item: 'Class Participation', percentage: 15 },
      { item: '5 Choral Warm-Ups (PDF)', percentage: 20 },
      { item: '30-Minute Major Work', percentage: 20 },
      { item: 'Midterm Exam', percentage: 15 },
      { item: 'Final Exam', percentage: 15 },
      { item: 'Period Presentations', percentage: 15 }
    ]
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'modules', label: 'Modules', icon: FolderOpen },
    { id: 'collaborations', label: 'Collaborations', icon: MessageSquare },
    { id: 'grades', label: 'Gradescope', icon: BarChart3 },
    { id: 'class-notebook', label: 'Class Notebook', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'help', label: 'Help', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <div className="flex min-h-[calc(100vh-4rem)] bg-background">{/* Account for header height */}
      {/* Left Sidebar Navigation - 10% */}
      <aside className="w-[10%] border-r bg-card">
        <div className="p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">Fall 2025</h2>
            <p className="text-sm text-muted-foreground">
              {courseData.courseCode}-01
            </p>
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground/80 hover:bg-muted'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Middle Content Section - 60% */}
      <main className="w-3/5 p-6 overflow-y-auto">
        {/* Course Header Banner */}
        <div className="mb-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-lg">
          <h2 className="text-3xl font-bold text-white">
            Fall 2025 Survey of African-American Music ({courseData.courseCode}-01)
          </h2>
        </div>

        {/* Welcome Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Welcome!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90 mb-4">
              Welcome to {courseData.courseCode}: {courseData.title}. This comprehensive course develops the complete modern conductor through intensive study of baton technique, score analysis, rehearsal pedagogy, and stylistic fluency.
            </p>
            <div className="flex gap-3">
              {isEnrolled ? (
                <Badge variant="default" className="px-4 py-2">Enrolled</Badge>
              ) : (
                <Button onClick={handleEnroll} disabled={isLoading}>
                  {isLoading ? 'Enrolling...' : 'Enroll in Course'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Course Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90">{courseData.purpose}</p>
          </CardContent>
        </Card>

        {/* Course Question Board */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Course Question Board
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Ask questions and engage with course content. Discussion threads will appear here.
            </p>
          </CardContent>
        </Card>

        {/* Learning Modules */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Learning Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <ChevronDown className="h-4 w-4 text-primary mt-1" />
                <span className="text-foreground/90">Week 1: Introduction to Conducting</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronDown className="h-4 w-4 text-primary mt-1" />
                <span className="text-foreground/90">Week 2: Basic Patterns & Gestures</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronDown className="h-4 w-4 text-primary mt-1" />
                <span className="text-foreground/90">Week 3: Score Analysis Fundamentals</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Course Objectives */}
        <Card className="mb-6">
          <Collapsible open={showObjectives} onOpenChange={setShowObjectives}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Learning Objectives
                  </span>
                  {showObjectives ? <ChevronUp /> : <ChevronDown />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2">
                  {courseData.objectives.map((objective, index) => (
                    <li key={index} className="text-foreground/90">{objective}</li>
                  ))}
                </ol>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Grading */}
        <Card className="mb-6">
          <Collapsible open={showGrading} onOpenChange={setShowGrading}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Grading Breakdown
                  </span>
                  {showGrading ? <ChevronUp /> : <ChevronDown />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {courseData.gradingBreakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-accent/30 rounded">
                      <span className="text-foreground/90">{item.item}</span>
                      <Badge variant="secondary">{item.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Required Materials */}
        <Card className="mb-6">
          <Collapsible open={showMaterials} onOpenChange={setShowMaterials}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Required Materials
                  </span>
                  {showMaterials ? <ChevronUp /> : <ChevronDown />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Textbooks</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {courseData.requiredTexts.map((text, index) => (
                      <li key={index} className="text-foreground/90">
                        <em>{text.title}</em> — {text.author}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Materials</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {courseData.requiredMaterials.map((material, index) => (
                      <li key={index} className="text-foreground/90">{material}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </main>

      {/* Right Sidebar - Resources */}
      <aside className="flex-1 border-l bg-card p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">To Do</h3>
            <p className="text-sm text-muted-foreground">Nothing for now</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Course Resources</h3>
            
            {/* Video Resources */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Access conducting demonstration videos
                </p>
              </CardContent>
            </Card>

            {/* Audio Resources */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  Audio Examples
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Listen to choral repertoire samples
                </p>
              </CardContent>
            </Card>

            {/* Sheet Music */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Sheet Music Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Download scores and study materials
                </p>
              </CardContent>
            </Card>

            {/* Additional Resources */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Course Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Syllabus, handouts, and readings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Instructor Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Instructor Contact</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p className="font-medium">{courseData.instructor.name}</p>
              <p className="text-muted-foreground">{courseData.instructor.email}</p>
              <p className="text-muted-foreground">Office: {courseData.instructor.office}</p>
              <p className="text-muted-foreground">Hours: {courseData.instructor.officeHours}</p>
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
    </div>
  );
}
