import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, BookOpen, Calendar, Users, FileText, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';

interface CourseTemplateProps {
  courseId: string;
  courseCode: string;
  title: string;
  credits: number;
  meetingTimes: string;
  location: string;
  instructor: {
    name: string;
    email: string;
    office: string;
    officeHours: string;
  };
  purpose: string;
  objectives: string[];
  requiredTexts: Array<{ title: string; author: string }>;
  requiredMaterials: string[];
  attendancePolicy: string;
  gradingBreakdown: Array<{ item: string; percentage: number }>;
  weeklySchedule: Array<{
    week: number;
    dates: string;
    topics: string[];
  }>;
  assignments: string[];
  disabilityStatement: string;
  academicHonestyStatement: string;
  textbookIframeUrl?: string;
}

export const CourseTemplate: React.FC<CourseTemplateProps> = ({
  courseId,
  courseCode,
  title,
  credits,
  meetingTimes,
  location,
  instructor,
  purpose,
  objectives,
  requiredTexts,
  requiredMaterials,
  attendancePolicy,
  gradingBreakdown,
  weeklySchedule,
  assignments,
  disabilityStatement,
  academicHonestyStatement,
  textbookIframeUrl,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Course Header */}
      <Card className="mb-8 bg-gradient-to-br from-primary/10 to-secondary/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl mb-2">{courseCode} — {title}</CardTitle>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>Credits:</strong> {credits}</p>
                <p><strong>Meeting Times:</strong> {meetingTimes}</p>
                <p><strong>Location:</strong> {location}</p>
                <p><strong>Instructor:</strong> {instructor.name}</p>
                <p><strong>Email:</strong> {instructor.email}</p>
                <p><strong>Office:</strong> {instructor.office}</p>
                <p><strong>Office Hours:</strong> {instructor.officeHours}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {isEnrolled ? (
                <Badge variant="default" className="text-lg px-4 py-2">Enrolled</Badge>
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
          </div>
        </CardHeader>
      </Card>

      {/* Purpose */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Purpose
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 leading-relaxed">{purpose}</p>
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
                  Course Objectives
                </span>
                {showObjectives ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <p className="mb-4 text-muted-foreground">By the end of the semester, students will:</p>
              <ol className="list-decimal list-inside space-y-2">
                {objectives.map((objective, index) => (
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
                  {requiredTexts.map((text, index) => (
                    <li key={index} className="text-foreground/90">
                      <em>{text.title}</em> — {text.author}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Required Materials</h4>
                <ul className="list-disc list-inside space-y-1">
                  {requiredMaterials.map((material, index) => (
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
                <p className="text-foreground/90 whitespace-pre-line">{attendancePolicy}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Grading Breakdown</h4>
                <div className="space-y-2">
                  {gradingBreakdown.map((item, index) => (
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
                {weeklySchedule.map((week) => (
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
      {textbookIframeUrl && isEnrolled && (
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
                  src={textbookIframeUrl}
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
            {assignments.map((assignment, index) => (
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
            <p className="text-foreground/90">{disabilityStatement}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Academic Honesty</h4>
            <p className="text-foreground/90">{academicHonestyStatement}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
