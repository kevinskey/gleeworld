import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Save, FileText, BookOpen, Target, ClipboardList, Calendar, 
  User, GraduationCap, Scale, Plus, Trash2, AlertCircle, CheckCircle,
  Link2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LearningObjectivesManager } from './LearningObjectivesManager';
import { GradingBreakdownEditor } from './GradingBreakdownEditor';
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';
import { RequirementsEditor } from './RequirementsEditor';

interface SyllabusTemplate {
  id?: string;
  course_id: string;
  name: string;
  term: string;
  credits: number;
  class_time: string;
  classroom: string;
  instructor_name: string;
  instructor_email: string;
  instructor_phone: string;
  instructor_office: string;
  office_hours: string;
  purpose: string;
  textbooks: { title: string; author: string; isbn?: string }[];
  attendance_policy: string;
  late_assignment_policy: string;
  academic_honesty_policy: string;
  disability_statement: string;
  grading_scale: Record<string, string>;
  grading_breakdown: { item: string; percentage: number }[];
  weekly_schedule: { week: string; topics: string }[];
  additional_policies: { title: string; content: string }[];
  is_published: boolean;
}

interface Props {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  instructorName?: string;
  instructorEmail?: string;
}

const DEFAULT_POLICIES = {
  attendance: `Each student is allowed to miss two classes with no penalty. Any absence, beyond two, lowers the grade by one letter grade. Students who miss four classes will be dropped from the class. Exceptions will be made for extenuating circumstances (chronic illness or family emergencies) to be determined by the professor.`,
  late_assignment: `Students are expected to turn in assignments on time. However, if an assignment is turned in late, the letter grade earned will be reduced by one letter grade for each day it is late.`,
  academic_honesty: `The Spelman College community is committed to maintaining the integrity of the College and its academic programs. Each student is required to abide by Spelman's code of conduct and is expected to produce work that reflects her own ideas. Academic dishonesty will not be tolerated.`,
  disability: `Any student who feels she may need an accommodation based on the impact of a disability should contact the Office of Disability Services privately to discuss her specific needs. Please contact the Office of Disability Services at (404) 223-7590 in MacVicar Hall to coordinate reasonable accommodations.`
};

export const SyllabusTemplateEditor: React.FC<Props> = ({
  courseId,
  courseCode,
  courseTitle,
  instructorName = '',
  instructorEmail = ''
}) => {
  const [syllabus, setSyllabus] = useState<SyllabusTemplate>({
    course_id: courseId,
    name: `${courseCode} Course Syllabus`,
    term: 'Spring 2026',
    credits: 3,
    class_time: '',
    classroom: '',
    instructor_name: instructorName,
    instructor_email: instructorEmail,
    instructor_phone: '',
    instructor_office: '',
    office_hours: '',
    purpose: '',
    textbooks: [],
    attendance_policy: DEFAULT_POLICIES.attendance,
    late_assignment_policy: DEFAULT_POLICIES.late_assignment,
    academic_honesty_policy: DEFAULT_POLICIES.academic_honesty,
    disability_statement: DEFAULT_POLICIES.disability,
    grading_scale: { 'A': '90-100', 'B': '80-89', 'C': '70-79', 'D': '60-69', 'F': 'Below 60' },
    grading_breakdown: [],
    weekly_schedule: [],
    additional_policies: [],
    is_published: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchSyllabus();
  }, [courseId]);

  const fetchSyllabus = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_syllabus_templates' as any)
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const d = data as any;
        setSyllabus({
          ...syllabus,
          ...d,
          textbooks: d.textbooks || [],
          grading_scale: d.grading_scale || syllabus.grading_scale,
          grading_breakdown: d.grading_breakdown || [],
          weekly_schedule: d.weekly_schedule || [],
          additional_policies: d.additional_policies || []
        });
      }
    } catch (error) {
      console.error('Error fetching syllabus:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSyllabus = async () => {
    setSaving(true);
    try {
      const syllabusData = {
        course_id: courseId,
        name: syllabus.name,
        term: syllabus.term,
        credits: syllabus.credits,
        class_time: syllabus.class_time,
        classroom: syllabus.classroom,
        instructor_name: syllabus.instructor_name,
        instructor_email: syllabus.instructor_email,
        instructor_phone: syllabus.instructor_phone,
        instructor_office: syllabus.instructor_office,
        office_hours: syllabus.office_hours,
        purpose: syllabus.purpose,
        textbooks: syllabus.textbooks,
        attendance_policy: syllabus.attendance_policy,
        late_assignment_policy: syllabus.late_assignment_policy,
        academic_honesty_policy: syllabus.academic_honesty_policy,
        disability_statement: syllabus.disability_statement,
        grading_scale: syllabus.grading_scale,
        grading_breakdown: syllabus.grading_breakdown,
        weekly_schedule: syllabus.weekly_schedule,
        additional_policies: syllabus.additional_policies,
        is_published: syllabus.is_published
      };

      if (syllabus.id) {
        const { error } = await supabase
          .from('gw_syllabus_templates' as any)
          .update(syllabusData)
          .eq('id', syllabus.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('gw_syllabus_templates' as any)
          .insert(syllabusData)
          .select()
          .single();
        if (error) throw error;
        setSyllabus(prev => ({ ...prev, id: (data as any).id }));
      }

      toast.success('Syllabus saved successfully');
    } catch (error) {
      console.error('Error saving syllabus:', error);
      toast.error('Failed to save syllabus');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SyllabusTemplate, value: any) => {
    setSyllabus(prev => ({ ...prev, [field]: value }));
  };

  const addTextbook = () => {
    setSyllabus(prev => ({
      ...prev,
      textbooks: [...prev.textbooks, { title: '', author: '', isbn: '' }]
    }));
  };

  const updateTextbook = (index: number, field: string, value: string) => {
    setSyllabus(prev => ({
      ...prev,
      textbooks: prev.textbooks.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

  const removeTextbook = (index: number) => {
    setSyllabus(prev => ({
      ...prev,
      textbooks: prev.textbooks.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div className="p-6 text-center">Loading syllabus...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{courseCode} Syllabus</h2>
          <p className="text-muted-foreground">{courseTitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={syllabus.is_published ? 'default' : 'secondary'}>
            {syllabus.is_published ? 'Published' : 'Draft'}
          </Badge>
          <Button onClick={saveSyllabus} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="info" className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Course Info</span>
          </TabsTrigger>
          <TabsTrigger value="objectives" className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Objectives</span>
          </TabsTrigger>
          <TabsTrigger value="requirements" className="flex items-center gap-1">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Requirements</span>
          </TabsTrigger>
          <TabsTrigger value="grading" className="flex items-center gap-1">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Grading</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Policies</span>
          </TabsTrigger>
        </TabsList>

        {/* Course Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Course Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Term/Semester</Label>
                <Input 
                  value={syllabus.term}
                  onChange={e => updateField('term', e.target.value)}
                  placeholder="e.g., Spring 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Credits</Label>
                <Input 
                  type="number"
                  value={syllabus.credits}
                  onChange={e => updateField('credits', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Class Time</Label>
                <Input 
                  value={syllabus.class_time}
                  onChange={e => updateField('class_time', e.target.value)}
                  placeholder="e.g., MWF 10:00am - 10:50am"
                />
              </div>
              <div className="space-y-2">
                <Label>Classroom</Label>
                <Input 
                  value={syllabus.classroom}
                  onChange={e => updateField('classroom', e.target.value)}
                  placeholder="e.g., Fine Arts 109"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Instructor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Instructor Name</Label>
                <Input 
                  value={syllabus.instructor_name}
                  onChange={e => updateField('instructor_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={syllabus.instructor_email}
                  onChange={e => updateField('instructor_email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={syllabus.instructor_phone}
                  onChange={e => updateField('instructor_phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Office</Label>
                <Input 
                  value={syllabus.instructor_office}
                  onChange={e => updateField('instructor_office', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Office Hours</Label>
                <Input 
                  value={syllabus.office_hours}
                  onChange={e => updateField('office_hours', e.target.value)}
                  placeholder="e.g., MWF 3-5pm or by appointment"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Purpose
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                value={syllabus.purpose}
                onChange={e => updateField('purpose', e.target.value)}
                placeholder="Describe the purpose and focus of this course..."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Required Textbooks
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addTextbook}>
                <Plus className="h-4 w-4 mr-1" />
                Add Textbook
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {syllabus.textbooks.map((textbook, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-4 p-4 border rounded-lg">
                  <div className="md:col-span-2">
                    <Label>Title</Label>
                    <Input 
                      value={textbook.title}
                      onChange={e => updateTextbook(index, 'title', e.target.value)}
                      placeholder="Book title"
                    />
                  </div>
                  <div>
                    <Label>Author</Label>
                    <Input 
                      value={textbook.author}
                      onChange={e => updateTextbook(index, 'author', e.target.value)}
                      placeholder="Author name"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label>ISBN (optional)</Label>
                      <Input 
                        value={textbook.isbn || ''}
                        onChange={e => updateTextbook(index, 'isbn', e.target.value)}
                        placeholder="ISBN"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeTextbook(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {syllabus.textbooks.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No textbooks added yet. Click "Add Textbook" to add one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Objectives Tab */}
        <TabsContent value="objectives">
          <LearningObjectivesManager 
            courseId={courseId}
            syllabusId={syllabus.id}
          />
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements">
          <RequirementsEditor 
            syllabusId={syllabus.id}
            onSave={saveSyllabus}
          />
        </TabsContent>

        {/* Grading Tab */}
        <TabsContent value="grading">
          <GradingBreakdownEditor 
            gradingBreakdown={syllabus.grading_breakdown}
            gradingScale={syllabus.grading_scale}
            onChange={(breakdown) => updateField('grading_breakdown', breakdown)}
            onScaleChange={(scale) => updateField('grading_scale', scale)}
          />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <WeeklyScheduleEditor 
            schedule={syllabus.weekly_schedule}
            onChange={(schedule) => updateField('weekly_schedule', schedule)}
          />
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={syllabus.attendance_policy}
                onChange={e => updateField('attendance_policy', e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Late Assignment Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={syllabus.late_assignment_policy}
                onChange={e => updateField('late_assignment_policy', e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic Honesty</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={syllabus.academic_honesty_policy}
                onChange={e => updateField('academic_honesty_policy', e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disability Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={syllabus.disability_statement}
                onChange={e => updateField('disability_statement', e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Publication Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {syllabus.is_published ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {syllabus.is_published ? 'Published' : 'Draft'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {syllabus.is_published 
                        ? 'Students can view this syllabus' 
                        : 'Only instructors can view this syllabus'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant={syllabus.is_published ? 'outline' : 'default'}
                  onClick={() => updateField('is_published', !syllabus.is_published)}
                >
                  {syllabus.is_published ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
