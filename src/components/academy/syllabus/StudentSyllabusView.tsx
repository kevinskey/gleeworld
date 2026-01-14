import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Mail, MapPin, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AcademyCourse } from '@/config/academyCourses';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedSyllabusRenderer, UnifiedSyllabusData, LearningObjective, CourseRequirement } from './UnifiedSyllabusRenderer';
import { getDefaultSyllabus } from '@/config/academySyllabusDefaults';

interface StudentSyllabusViewProps {
  course: AcademyCourse;
}

export const StudentSyllabusView: React.FC<StudentSyllabusViewProps> = ({ course }) => {
  const [syllabus, setSyllabus] = useState<UnifiedSyllabusData | null>(null);
  const [objectives, setObjectives] = useState<LearningObjective[]>([]);
  const [requirements, setRequirements] = useState<CourseRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDefaults, setUsingDefaults] = useState(false);

  useEffect(() => {
    fetchSyllabusData();
  }, [course.id]);

  const fetchSyllabusData = async () => {
    try {
      // Fetch published syllabus template with new columns
      const { data: syllabusData, error: syllabusError } = await supabase
        .from('gw_syllabus_templates')
        .select('id, name, term, credits, class_time, classroom, instructor_name, instructor_email, instructor_office, office_hours, purpose, course_model, course_badge, course_phases, grading_breakdown, grading_scale, weekly_schedule, attendance_policy, late_assignment_policy, academic_honesty_policy, disability_statement, additional_policies, is_published')
        .eq('course_id', course.id)
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syllabusError) throw syllabusError;
      
      if (syllabusData) {
        setSyllabus(syllabusData as unknown as UnifiedSyllabusData);

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
      } else {
        // No DB syllabus - use defaults from config
        const defaults = getDefaultSyllabus(course.courseCode);
        if (defaults) {
          setSyllabus({ id: 'default', ...defaults } as UnifiedSyllabusData);
          setUsingDefaults(true);
        }
      }
    } catch (error) {
      console.error('Error fetching syllabus:', error);
      // Try defaults on error
      const defaults = getDefaultSyllabus(course.courseCode);
      if (defaults) {
        setSyllabus({ id: 'default', ...defaults } as UnifiedSyllabusData);
        setUsingDefaults(true);
      }
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

  // If we have syllabus data (from DB or defaults), use the unified renderer
  if (syllabus) {
    return (
      <UnifiedSyllabusRenderer 
        course={course}
        syllabus={syllabus}
        objectives={objectives}
        requirements={requirements}
      />
    );
  }

  // Fallback for courses without any syllabus data
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
            <span className="font-semibold">{course.instructor?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{course.instructor?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Office: {course.instructor?.office}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Office Hours: {course.instructor?.hours}</span>
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
};
