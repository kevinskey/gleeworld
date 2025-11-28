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
  Lightbulb,
  ClipboardList,
  BarChart3,
  Pin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';

export default function Mus210() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const courseId = 'mus-210-conducting';
  const { enrollment, isEnrolled, isLoading, enroll } = useCourseEnrollment(courseId);

  const [showObjectives, setShowObjectives] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTextbook, setShowTextbook] = useState(false);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth?tab=login');
      return;
    }
    await enroll();
  };

  const handleMusicLibrary = () => {
    navigate('/music-library');
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
    purpose: 'This course develops the complete modern conductor. Students gain baton technique, expressive gesture, score analysis methods, rehearsal pedagogy, and stylistic fluency across classical, spirituals, gospel, and contemporary choral traditions. Emphasis is placed on artistry, leadership, and practical rehearsal skills.',
    objectives: [
      'Demonstrate proper baton and expressive gesture technique.',
      'Conduct beat patterns in multiple meters and tempi.',
      'Employ advanced conducting techniques (phrase shaping, left hand, fermatas, releases, tempo changes).',
      'Analyze choral scores for harmony, text, structure, and style.',
      'Demonstrate musicianship skills essential for conducting success.',
      'Define major choral forms, styles, and terms.',
      'Understand ensemble setup, balance, instrumentation, and seating.',
      'Memorize and conduct 30 minutes of a major choral work.',
      'Identify online and print choral resources.',
      'Conduct rehearsals in real ensemble settings.'
    ],
    requiredTexts: [
      { title: 'A Survey of Choral Music', author: 'Homer Ulrich' },
      { title: 'The Modern Conductor', author: 'Elizabeth Green & Mark Gibson' }
    ],
    requiredMaterials: [
      'Baton',
      'Video recording device',
      'Internet access',
      'Pencil (No. 2)'
    ],
    attendancePolicy: `Students may miss 2 classes without penalty.
Each additional absence lowers the final grade by one letter.
Four absences result in removal from the class (unless documented emergencies).
Three tardies = 1 absence.`,
    gradingBreakdown: [
      { item: 'Class Participation', percentage: 15 },
      { item: '5 Choral Warm-Ups (PDF)', percentage: 20 },
      { item: '30-Minute Major Work (Final Project)', percentage: 20 },
      { item: 'Midterm Exam', percentage: 15 },
      { item: 'Final Exam', percentage: 15 },
      { item: 'Period Presentations', percentage: 15 }
    ],
    weeklySchedule: [
      { week: 1, dates: 'Jan 14 & 16', topics: ['Course introduction', 'Posture, window, meter', 'Basic conducting patterns', 'Diagnostic video'] },
      { week: 2, dates: 'Jan 21 & 23', topics: ['Patterns continued', '"Choral Conductor as Leader" presentations', 'Conducting Exercise 1'] },
      { week: 3, dates: 'Jan 28 & 30', topics: ['Pattern refinement', 'Conducting Exercise 2'] },
      { week: 4, dates: 'Feb 4 & 6', topics: ['Renaissance presentations', 'Renaissance style & practice'] },
      { week: 5, dates: 'Feb 11 & 13', topics: ['Renaissance Conducting Exam'] },
      { week: 6, dates: 'Feb 18 & 20', topics: ['Baroque presentations'] },
      { week: 7, dates: 'Feb 25 & 27', topics: ['Baroque Conducting Exam'] },
      { week: 8, dates: 'March 5 & 6', topics: ['MIDTERM EXAM WEEK', 'Conducting Exercise 3', 'Classical presentations', 'Midterm practical & written'] },
      { week: 9, dates: 'March 9–13', topics: ['SPRING BREAK — No Classes'] },
      { week: 10, dates: 'March 17 & 19', topics: ['Classical conducting', 'Classical Conducting Exam'] },
      { week: 11, dates: 'March 24 & 26', topics: ['Romantic presentations'] },
      { week: 12, dates: 'March 31 & April 2', topics: ['Romantic Conducting Exam', 'Conducting Exercise 4', 'Negro Spirituals presentations'] },
      { week: 13, dates: 'April 7 & 9', topics: ['Negro Spirituals Conducting Exam'] },
      { week: 14, dates: 'April 14 & 16', topics: ['Gospel presentations'] },
      { week: 15, dates: 'April 21 & 23', topics: ['Gospel Conducting Exam', 'Final project coaching'] },
      { week: 16, dates: 'April 28 & 29', topics: ['Final project practice', 'Course evaluations'] },
      { week: 17, dates: 'May 4–8', topics: ['FINAL EXAM WEEK', 'Conduct 30-Minute Final Project', 'Written Final Exam'] }
    ],
    assignments: [
      'Complete assigned readings and weekly conducting labs',
      'Prepare 5 original choral warm-ups (PDF)',
      'Present historical periods with one-page handout',
      'Conduct one work from each major musical era',
      'Midterm written + practical exam',
      'Final project: 30 minutes of a major work by memory'
    ],
    disabilityStatement: 'Students requiring accommodations should contact the Office of Disability Services (MacVicar Hall, 404-223-7590) for coordination.',
    academicHonestyStatement: 'All submitted work must be original and comply with Spelman\'s Code of Conduct regarding academic integrity.',
    textbookIframeUrl: 'https://gamma.app/embed/qpwgjhqyohq63uo'
  };

  // 4-column feature sections
  const featureSections = [
    {
      icon: Lightbulb,
      title: 'Course Overview',
      description: 'Access syllabus, objectives, and course information',
      color: 'text-blue-500'
    },
    {
      icon: ClipboardList,
      title: 'Assignments',
      description: 'View and submit your conducting assignments',
      color: 'text-purple-500'
    },
    {
      icon: BarChart3,
      title: 'Gradebook',
      description: 'Track your progress and grades throughout the semester',
      color: 'text-green-500'
    },
    {
      icon: Pin,
      title: 'Announcements',
      description: 'Stay updated with course announcements and reminders',
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hero Banner */}
      <div className="mb-8 bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8 rounded-lg">
        <h1 className="text-4xl font-bold text-white">Fall 2025 {courseData.courseCode} — {courseData.title}</h1>
      </div>

      {/* 4-Column Icon Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {featureSections.map((section, index) => {
          const IconComponent = section.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-background to-muted/30">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className={`p-4 rounded-full bg-muted ${section.color}`}>
                  <IconComponent className="h-12 w-12" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Welcome Section */}
      <Card className="mb-8 bg-gradient-to-br from-primary/10 to-secondary/10">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 leading-relaxed mb-4">
            Welcome to {courseData.courseCode}: {courseData.title}. This comprehensive course develops the complete modern conductor through intensive study of baton technique, score analysis, rehearsal pedagogy, and stylistic fluency across diverse choral traditions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <h4 className="font-semibold mb-2">Course Information</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><strong>Credits:</strong> {courseData.credits}</p>
                <p><strong>Meeting Times:</strong> {courseData.meetingTimes}</p>
                <p><strong>Location:</strong> {courseData.location}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Instructor</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><strong>Name:</strong> {courseData.instructor.name}</p>
                <p><strong>Email:</strong> {courseData.instructor.email}</p>
                <p><strong>Office:</strong> {courseData.instructor.office}</p>
                <p><strong>Hours:</strong> {courseData.instructor.officeHours}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {isEnrolled ? (
              <Badge variant="default" className="text-lg px-4 py-2 w-fit">Enrolled</Badge>
            ) : (
              <Button onClick={handleEnroll} disabled={isLoading}>
                {isLoading ? 'Enrolling...' : 'Register for Course'}
              </Button>
            )}
            {user && (
              <Button variant="outline" onClick={() => navigate('/auth?tab=login')}>
                Student Login
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Course Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 leading-relaxed mb-4">{courseData.purpose}</p>
          <p className="text-sm text-muted-foreground">
            This course provides comprehensive training in choral conducting technique, score analysis, and rehearsal methodology. Students will develop proficiency in conducting gestures, gain fluency in diverse musical styles, and build practical skills for leading choral ensembles.
          </p>
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
              <p className="mb-4 text-muted-foreground">By the end of the semester, students will:</p>
              <ol className="list-decimal list-inside space-y-2">
                {courseData.objectives.map((objective, index) => (
                  <li key={index} className="text-foreground/90">{objective}</li>
                ))}
              </ol>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Required Texts & Materials */}
      <Card className="mb-6">
        <Collapsible open={showMaterials} onOpenChange={setShowMaterials}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Required Texts & Materials
                </span>
                {showMaterials ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Required Texts</h4>
                <ul className="list-disc list-inside space-y-1">
                  {courseData.requiredTexts.map((text, index) => (
                    <li key={index} className="text-foreground/90">
                      <em>{text.title}</em> — {text.author}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Required Materials</h4>
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

      {/* Grading & Attendance */}
      <Card className="mb-6">
        <Collapsible open={showGrading} onOpenChange={setShowGrading}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendance & Grading
                </span>
                {showGrading ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Attendance Policy</h4>
                <p className="text-foreground/90 whitespace-pre-line">{courseData.attendancePolicy}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Grading Breakdown</h4>
                <div className="space-y-2">
                  {courseData.gradingBreakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-accent/30 rounded">
                      <span className="text-foreground/90">{item.item}</span>
                      <Badge variant="secondary">{item.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Weekly Schedule */}
      <Card className="mb-6">
        <Collapsible open={showSchedule} onOpenChange={setShowSchedule}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Schedule
                </span>
                {showSchedule ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                {courseData.weeklySchedule.map((week) => (
                  <div key={week.week} className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">
                      Week {week.week} — {week.dates}
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {week.topics.map((topic, index) => (
                        <li key={index} className="text-foreground/90">{topic}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Embedded Textbook */}
      {courseData.textbookIframeUrl && isEnrolled && (
        <Card className="mb-6">
          <Collapsible open={showTextbook} onOpenChange={setShowTextbook}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Textbook
                  </span>
                  {showTextbook ? <ChevronUp /> : <ChevronDown />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <iframe
                  src={courseData.textbookIframeUrl}
                  style={{ width: '100%', maxWidth: '100%', height: '600px' }}
                  allow="fullscreen"
                  title="Course Textbook"
                  className="rounded-lg border"
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Music Library Access */}
      {isEnrolled && (
        <Card className="mb-6 bg-gradient-to-br from-accent/20 to-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Music Library Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-foreground/90">
              As an enrolled student, you have full access to the Glee World music library.
            </p>
            <Button onClick={handleMusicLibrary}>
              Access Music Library
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assignments */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assignments / Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            {courseData.assignments.map((assignment, index) => (
              <li key={index} className="text-foreground/90">{assignment}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Statements */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Important Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Disability Statement</h4>
            <p className="text-foreground/90">{courseData.disabilityStatement}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Academic Honesty</h4>
            <p className="text-foreground/90">{courseData.academicHonestyStatement}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
