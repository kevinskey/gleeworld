import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, MapPin, User, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ClassSchedule {
  id: string;
  course_number: string;
  class_name: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  semester: string;
  academic_year: string;
  room_location?: string;
  professor_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClassScheduleFormData {
  course_number: string;
  class_name: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  semester: string;
  academic_year: string;
  room_location: string;
  professor_name: string;
}

const DAYS_OF_WEEK = [
  { value: 'M', label: 'Monday' },
  { value: 'T', label: 'Tuesday' },
  { value: 'W', label: 'Wednesday' },
  { value: 'R', label: 'Thursday' },
  { value: 'F', label: 'Friday' },
  { value: 'S', label: 'Saturday' },
  { value: 'U', label: 'Sunday' }
];

const SEMESTERS = ['Fall', 'Spring', 'Summer'];

const formatTime = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

const formatDays = (days: string[]) => {
  return days.join(', ');
};

export default function ClassScheduleManager() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ClassScheduleFormData>({
    course_number: '',
    class_name: '',
    days_of_week: [],
    start_time: '',
    end_time: '',
    semester: 'Fall',
    academic_year: new Date().getFullYear().toString(),
    room_location: '',
    professor_name: ''
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_class_schedules')
        .select('*')
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading class schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load class schedules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      course_number: '',
      class_name: '',
      days_of_week: [],
      start_time: '',
      end_time: '',
      semester: 'Fall',
      academic_year: new Date().getFullYear().toString(),
      room_location: '',
      professor_name: ''
    });
    setEditingSchedule(null);
  };

  const handleEdit = (schedule: ClassSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      course_number: schedule.course_number,
      class_name: schedule.class_name,
      days_of_week: schedule.days_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      semester: schedule.semester,
      academic_year: schedule.academic_year,
      room_location: schedule.room_location || '',
      professor_name: schedule.professor_name || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this class schedule?')) return;

    try {
      const { error } = await supabase
        .from('gw_class_schedules')
        .update({ is_active: false })
        .eq('id', scheduleId);

      if (error) throw error;

      await loadSchedules();
      toast({
        title: "Success",
        description: "Class schedule deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete class schedule",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.days_of_week.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one day of the week",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const scheduleData = {
        ...formData,
        user_id: user.id
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('gw_class_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_class_schedules')
          .insert([scheduleData]);

        if (error) throw error;
      }

      await loadSchedules();
      setIsDialogOpen(false);
      resetForm();
      
      toast({
        title: "Success",
        description: `Class schedule ${editingSchedule ? 'updated' : 'created'} successfully`
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save class schedule",
        variant: "destructive"
      });
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading class schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Class Schedule Manager</h2>
          <p className="text-muted-foreground">
            Manage your class schedules for conflict analysis and sectional planning
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? 'Edit Class Schedule' : 'Add New Class Schedule'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Course Number *</label>
                  <Input
                    value={formData.course_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, course_number: e.target.value }))}
                    placeholder="e.g., MUSC 101"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Academic Year</label>
                  <Input
                    value={formData.academic_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                    placeholder="2024"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Class Name *</label>
                <Input
                  value={formData.class_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
                  placeholder="e.g., Music Theory I"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Days of Week *</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label key={day.value} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={formData.days_of_week.includes(day.value)}
                        onCheckedChange={() => handleDayToggle(day.value)}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Time *</label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">End Time *</label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    {SEMESTERS.map(semester => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Room Location</label>
                  <Input
                    value={formData.room_location}
                    onChange={(e) => setFormData(prev => ({ ...prev, room_location: e.target.value }))}
                    placeholder="e.g., Music Building Room 101"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Professor Name</label>
                  <Input
                    value={formData.professor_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, professor_name: e.target.value }))}
                    placeholder="e.g., Dr. Smith"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  {editingSchedule ? 'Update' : 'Save'} Schedule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No class schedules found</p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{schedule.class_name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Badge variant="secondary">{schedule.course_number}</Badge>
                      <span>•</span>
                      <span>{schedule.semester} {schedule.academic_year}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDays(schedule.days_of_week)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                  </div>
                  
                  {schedule.room_location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.room_location}</span>
                    </div>
                  )}
                  
                  {schedule.professor_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.professor_name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}