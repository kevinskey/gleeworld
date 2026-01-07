import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Pencil, Trash2, GraduationCap, Save, Music, BookOpen, Mic, Eye, Award, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AcademyCourse {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  level: string | null;
  duration: string | null;
  highlights: string[] | null;
  icon_name: string | null;
  route: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  instructor_office: string | null;
  instructor_office_hours: string | null;
  is_active: boolean;
  display_order: number | null;
}

const ICON_OPTIONS = [
  { value: 'Music', label: 'Music', icon: Music },
  { value: 'BookOpen', label: 'Book', icon: BookOpen },
  { value: 'Mic', label: 'Microphone', icon: Mic },
  { value: 'Eye', label: 'Eye', icon: Eye },
  { value: 'Award', label: 'Award', icon: Award },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'GraduationCap', label: 'Graduation', icon: GraduationCap },
];

const LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels', 'Audition Required'];

export default function AcademyCoursesAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [saving, setSaving] = useState(false);
  const [highlightInput, setHighlightInput] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('glee_academy_courses')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course: AcademyCourse) => {
    setSelectedCourse({ ...course });
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCourse({
      id: '',
      course_code: '',
      title: '',
      description: '',
      level: 'All Levels',
      duration: '16 Weeks',
      highlights: [],
      icon_name: 'BookOpen',
      route: '',
      instructor_name: 'Dr. Kevin Johnson',
      instructor_email: 'kjohns10@spelman.edu',
      instructor_office: 'Fine Arts 105',
      instructor_office_hours: 'MWF 3-5 PM',
      is_active: true,
      display_order: courses.length + 1
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCourse || !selectedCourse.course_code || !selectedCourse.title) {
      toast({
        title: 'Error',
        description: 'Course code and title are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      // Generate route from course code if not set
      const route = selectedCourse.route || `/academy/${selectedCourse.course_code.toLowerCase().replace(' ', '-')}`;
      
      const courseData = {
        course_code: selectedCourse.course_code,
        title: selectedCourse.title,
        description: selectedCourse.description,
        level: selectedCourse.level,
        duration: selectedCourse.duration,
        highlights: selectedCourse.highlights,
        icon_name: selectedCourse.icon_name,
        route: route,
        instructor_name: selectedCourse.instructor_name,
        instructor_email: selectedCourse.instructor_email,
        instructor_office: selectedCourse.instructor_office,
        instructor_office_hours: selectedCourse.instructor_office_hours,
        is_active: selectedCourse.is_active,
        display_order: selectedCourse.display_order
      };

      if (selectedCourse.id) {
        // Update existing
        const { error } = await supabase
          .from('glee_academy_courses')
          .update(courseData)
          .eq('id', selectedCourse.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Course updated' });
      } else {
        // Create new
        const { error } = await supabase
          .from('glee_academy_courses')
          .insert(courseData);
        if (error) throw error;
        toast({ title: 'Success', description: 'Course created' });
      }

      setEditDialogOpen(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (error: any) {
      console.error('Error saving course:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save course',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
      const { error } = await supabase
        .from('glee_academy_courses')
        .delete()
        .eq('id', courseId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Course deleted' });
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (course: AcademyCourse) => {
    try {
      const { error } = await supabase
        .from('glee_academy_courses')
        .update({ is_active: !course.is_active })
        .eq('id', course.id);
      if (error) throw error;
      fetchCourses();
    } catch (error) {
      console.error('Error toggling course:', error);
    }
  };

  const addHighlight = () => {
    if (!highlightInput.trim() || !selectedCourse) return;
    setSelectedCourse({
      ...selectedCourse,
      highlights: [...(selectedCourse.highlights || []), highlightInput.trim()]
    });
    setHighlightInput('');
  };

  const removeHighlight = (index: number) => {
    if (!selectedCourse) return;
    setSelectedCourse({
      ...selectedCourse,
      highlights: selectedCourse.highlights?.filter((_, i) => i !== index) || []
    });
  };

  const getIconComponent = (iconName: string | null) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
    return iconOption?.icon || BookOpen;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              Glee Academy Courses
            </h1>
            <p className="text-muted-foreground text-sm">Manage course cards displayed on the dashboard</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => {
            const IconComponent = getIconComponent(course.icon_name);
            return (
              <Card key={course.id} className={`relative ${!course.is_active ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {course.course_code}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={course.is_active}
                        onCheckedChange={() => handleToggleActive(course)}
                      />
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{course.title}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{course.level}</Badge>
                    <Badge variant="outline" className="text-xs">{course.duration}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {course.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {course.highlights?.slice(0, 3).map((h, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
                    ))}
                    {(course.highlights?.length || 0) > 3 && (
                      <Badge variant="secondary" className="text-xs">+{(course.highlights?.length || 0) - 3}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(course)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(course.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedCourse?.id ? 'Edit Course' : 'Create New Course'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedCourse && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course Code *</Label>
                    <Input
                      value={selectedCourse.course_code}
                      onChange={e => setSelectedCourse({ ...selectedCourse, course_code: e.target.value })}
                      placeholder="e.g., MUS 210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={selectedCourse.icon_name || 'BookOpen'}
                      onValueChange={v => setSelectedCourse({ ...selectedCourse, icon_name: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={selectedCourse.title}
                    onChange={e => setSelectedCourse({ ...selectedCourse, title: e.target.value })}
                    placeholder="e.g., Choral Conducting and Literature"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={selectedCourse.description || ''}
                    onChange={e => setSelectedCourse({ ...selectedCourse, description: e.target.value })}
                    placeholder="Course description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select
                      value={selectedCourse.level || 'All Levels'}
                      onValueChange={v => setSelectedCourse({ ...selectedCourse, level: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      value={selectedCourse.duration || ''}
                      onChange={e => setSelectedCourse({ ...selectedCourse, duration: e.target.value })}
                      placeholder="e.g., 16 Weeks"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Course Highlights</Label>
                  <div className="flex gap-2">
                    <Input
                      value={highlightInput}
                      onChange={e => setHighlightInput(e.target.value)}
                      placeholder="Add a highlight..."
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                    />
                    <Button type="button" variant="outline" onClick={addHighlight}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCourse.highlights?.map((h, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {h}
                        <button onClick={() => removeHighlight(i)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Instructor Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={selectedCourse.instructor_name || ''}
                        onChange={e => setSelectedCourse({ ...selectedCourse, instructor_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={selectedCourse.instructor_email || ''}
                        onChange={e => setSelectedCourse({ ...selectedCourse, instructor_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Office</Label>
                      <Input
                        value={selectedCourse.instructor_office || ''}
                        onChange={e => setSelectedCourse({ ...selectedCourse, instructor_office: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Office Hours</Label>
                      <Input
                        value={selectedCourse.instructor_office_hours || ''}
                        onChange={e => setSelectedCourse({ ...selectedCourse, instructor_office_hours: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedCourse.is_active}
                    onCheckedChange={v => setSelectedCourse({ ...selectedCourse, is_active: v })}
                  />
                  <Label>Active (visible on dashboard)</Label>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}