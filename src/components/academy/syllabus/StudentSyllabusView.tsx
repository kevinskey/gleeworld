import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  BookOpen, FileText, BarChart3, Clock, Calendar, 
  ChevronUp, ChevronDown, Users, Mail, MapPin, 
  Target, CheckCircle2, Scale, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AcademyCourse } from '@/config/academyCourses';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentSyllabusViewProps {
  course: AcademyCourse;
}

interface SyllabusData {
  id: string;
  name: string;
  term: string | null;
  credits: number | null;
  class_time: string | null;
  classroom: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  instructor_office: string | null;
  office_hours: string | null;
  purpose: string | null;
  grading_breakdown: any;
  grading_scale: any;
  weekly_schedule: any;
  attendance_policy: string | null;
  late_assignment_policy: string | null;
  academic_honesty_policy: string | null;
  disability_statement: string | null;
  additional_policies: any;
  is_published: boolean | null;
}

interface LearningObjective {
  id: string;
  objective_text: string;
  bloom_level: string;
  is_measurable: boolean;
}

interface CourseRequirement {
  id: string;
  requirement_text: string;
  weight_percentage: number;
  position: number;
}

export const StudentSyllabusView: React.FC<StudentSyllabusViewProps> = ({ course }) => {
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [objectives, setObjectives] = useState<LearningObjective[]>([]);
  const [requirements, setRequirements] = useState<CourseRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showObjectives, setShowObjectives] = useState(true);
  const [showGrading, setShowGrading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  useEffect(() => {
    fetchSyllabusData();
  }, [course.id]);

  const fetchSyllabusData = async () => {
    try {
      // Fetch published syllabus template
      const { data: syllabusData, error: syllabusError } = await supabase
        .from('gw_syllabus_templates')
        .select('id, name, term, credits, class_time, classroom, instructor_name, instructor_email, instructor_office, office_hours, purpose, grading_breakdown, grading_scale, weekly_schedule, attendance_policy, late_assignment_policy, academic_honesty_policy, disability_statement, additional_policies, is_published')
        .eq('course_id', course.id)
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syllabusError) throw syllabusError;
      
      if (syllabusData) {
        setSyllabus(syllabusData as SyllabusData);

        // Fetch learning objectives
        const { data: objectivesData } = await supabase
          .from('gw_learning_objectives')
          .select('*')
          .eq('syllabus_id', syllabusData.id)
          .order('position', { ascending: true });
        
        setObjectives((objectivesData || []) as LearningObjective[]);

        // Fetch course requirements
        const { data: requirementsData } = await supabase
          .from('gw_course_requirements')
          .select('*')
          .eq('syllabus_id', syllabusData.id)
          .order('position', { ascending: true });
        
        setRequirements((requirementsData || []) as CourseRequirement[]);
      }
    } catch (error) {
      console.error('Error fetching syllabus:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // If no published syllabus, show default info from course config
  if (!syllabus) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{course.title}</CardTitle>
              <Badge variant="outline">3 Credits</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{course.courseCode}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">Meeting Times</p>
                <p className="text-muted-foreground">TBA</p>
              </div>
              <div>
                <p className="font-semibold">Location</p>
                <p className="text-muted-foreground">TBA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instructor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{course.instructor.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{course.instructor.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Office: {course.instructor.office}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Office Hours: {course.instructor.hours}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90">{course.description}</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              The full syllabus for this course has not been published yet.
              <br />
              Please check back later or contact your instructor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gradingBreakdown = syllabus.grading_breakdown || [];
  const gradingScale = syllabus.grading_scale || {};
  const weeklySchedule = syllabus.weekly_schedule || [];

  return (
    <div className="space-y-4">
      {/* Course Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{syllabus.name || course.title}</CardTitle>
            <Badge variant="outline">{syllabus.credits || 3} Credits</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{course.courseCode} • {syllabus.term}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Meeting Times</p>
              <p className="text-muted-foreground">{syllabus.class_time || 'TBA'}</p>
            </div>
            <div>
              <p className="font-semibold">Location</p>
              <p className="text-muted-foreground">{syllabus.classroom || 'TBA'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructor Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instructor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{syllabus.instructor_name || course.instructor.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{syllabus.instructor_email || course.instructor.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Office: {syllabus.instructor_office || course.instructor.office}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Office Hours: {syllabus.office_hours || course.instructor.hours}</span>
          </div>
        </CardContent>
      </Card>

      {/* Course Purpose */}
      {syllabus.purpose && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Purpose
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90 whitespace-pre-wrap">{syllabus.purpose}</p>
          </CardContent>
        </Card>
      )}

      {/* Learning Objectives */}
      {objectives.length > 0 && (
        <Card>
          <Collapsible open={showObjectives} onOpenChange={setShowObjectives}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Learning Objectives
                  </span>
                  {showObjectives ? <ChevronUp /> : <ChevronDown />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upon completion of this course, students will be able to:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  {objectives.map((objective) => (
                    <li key={objective.id} className="text-foreground/90">
                      {objective.objective_text}
                      {objective.bloom_level && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {objective.bloom_level}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Course Requirements */}
      {requirements.length > 0 && (
        <Card>
          <Collapsible open={showRequirements} onOpenChange={setShowRequirements}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Course Requirements
                  </span>
                  {showRequirements ? <ChevronUp /> : <ChevronDown />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {requirements.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{req.requirement_text}</span>
                      {req.weight_percentage > 0 && (
                        <Badge>{req.weight_percentage}%</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Grading Breakdown */}
      {gradingBreakdown.length > 0 && (
        <Card>
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
                  {gradingBreakdown.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{item.item || item.name || item.category}</span>
                      <Badge variant="secondary">{item.percentage}%</Badge>
                    </div>
                  ))}
                </div>

                {Object.keys(gradingScale).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Grading Scale
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(gradingScale).map(([grade, range]) => (
                        <div key={grade} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="font-medium">{grade}</span>
                          <span className="text-sm text-muted-foreground">{String(range)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Weekly Schedule */}
      {weeklySchedule.length > 0 && (
        <Card>
          <Collapsible open={showSchedule} onOpenChange={setShowSchedule}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Course Schedule
                  </span>
                  {showSchedule ? <ChevronUp /> : <ChevronDown />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {weeklySchedule.map((week: any, index: number) => (
                    <div key={index} className="flex gap-4 p-3 border rounded-lg">
                      <div className="flex-shrink-0 w-20 font-semibold text-primary">
                        {week.week || `Week ${index + 1}`}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{week.topics || week.topic}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Policies */}
      {(syllabus.attendance_policy || syllabus.late_assignment_policy || syllabus.academic_honesty_policy) && (
        <Card>
          <Collapsible open={showPolicies} onOpenChange={setShowPolicies}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Course Policies
                  </span>
                  {showPolicies ? <ChevronUp /> : <ChevronDown />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {syllabus.attendance_policy && (
                  <div>
                    <h4 className="font-semibold mb-2">Attendance Policy</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{syllabus.attendance_policy}</p>
                  </div>
                )}
                {syllabus.late_assignment_policy && (
                  <div>
                    <h4 className="font-semibold mb-2">Late Work Policy</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{syllabus.late_assignment_policy}</p>
                  </div>
                )}
                {syllabus.academic_honesty_policy && (
                  <div>
                    <h4 className="font-semibold mb-2">Academic Honesty</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{syllabus.academic_honesty_policy}</p>
                  </div>
                )}
                {syllabus.disability_statement && (
                  <div>
                    <h4 className="font-semibold mb-2">Disability Statement</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{syllabus.disability_statement}</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
};
