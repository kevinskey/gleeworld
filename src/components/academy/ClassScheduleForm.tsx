import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Trash2, Clock, BookOpen, MapPin, User, Loader2, CheckCircle, Users } from 'lucide-react';
import { useStudentClassSchedule, ClassScheduleInput } from '@/hooks/useStudentClassSchedule';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'M' },
  { value: 'Tuesday', label: 'T' },
  { value: 'Wednesday', label: 'W' },
  { value: 'Thursday', label: 'Th' },
  { value: 'Friday', label: 'F' },
];

interface ClassScheduleFormProps {
  semester?: string;
  className?: string;
}

export const ClassScheduleForm: React.FC<ClassScheduleFormProps> = ({ 
  semester = 'Spring 2026',
  className 
}) => {
  const navigate = useNavigate();
  const { isAdmin, isExecutiveBoard } = useUserRole();
  const { schedules, loading, saving, addSchedule, deleteSchedule, hasConflicts, conflictCount } = useStudentClassSchedule(semester);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<ClassScheduleInput>({
    course_name: '',
    course_code: '',
    days: [],
    start_time: '',
    end_time: '',
    location: '',
    instructor_name: '',
    notes: '',
  });

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_name || formData.days.length === 0 || !formData.start_time || !formData.end_time) {
      return;
    }

    const result = await addSchedule(formData);
    if (result) {
      setFormData({
        course_name: '',
        course_code: '',
        days: [],
        start_time: '',
        end_time: '',
        location: '',
        instructor_name: '',
        notes: '',
      });
      setIsAdding(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Class Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="h-32 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Your Class Schedule
            </CardTitle>
            <CardDescription className="mt-1">
              {semester} — Enter your classes so we can check for rehearsal conflicts
            </CardDescription>
          </div>
          {hasConflicts && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {conflictCount} Conflict{conflictCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {/* Admin Link to View All Schedules */}
        {(isAdmin() || isExecutiveBoard()) && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/student-schedules')}
            className="w-full sm:w-auto"
          >
            <Users className="h-4 w-4 mr-2" />
            View All Student Schedules
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rehearsal Schedule Reminder */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
          <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-primary">Glee Club Rehearsal Schedule</p>
            <p className="text-muted-foreground">Monday, Wednesday, Friday • 5:00 PM – 6:15 PM</p>
          </div>
        </div>

        {/* Existing Classes */}
        {schedules.length > 0 && (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div 
                key={schedule.id} 
                className={cn(
                  "p-3 rounded-lg border flex items-center justify-between gap-3",
                  schedule.has_conflict 
                    ? "bg-destructive/5 border-destructive/30" 
                    : "bg-muted/30 border-border"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{schedule.course_name}</span>
                    {schedule.course_code && (
                      <Badge variant="outline" className="text-xs">{schedule.course_code}</Badge>
                    )}
                    {schedule.has_conflict ? (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Conflict
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        No Conflict
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{schedule.days.join(', ')}</span>
                    <span>•</span>
                    <span>{formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}</span>
                    {schedule.location && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {schedule.location}
                        </span>
                      </>
                    )}
                  </div>
                  {schedule.has_conflict && schedule.conflict_details && (
                    <p className="text-xs text-destructive mt-1">{schedule.conflict_details}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => deleteSchedule(schedule.id)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Class Form */}
        {isAdding ? (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course_name">Course Name *</Label>
                <Input
                  id="course_name"
                  placeholder="e.g., Introduction to Psychology"
                  value={formData.course_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course_code">Course Code</Label>
                <Input
                  id="course_code"
                  placeholder="e.g., PSY 101"
                  value={formData.course_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_code: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days *</Label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 font-medium text-sm transition-colors",
                      formData.days.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Giles Hall 201"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructor_name">Instructor</Label>
                <Input
                  id="instructor_name"
                  placeholder="e.g., Dr. Smith"
                  value={formData.instructor_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving || !formData.course_name || formData.days.length === 0 || !formData.start_time || !formData.end_time}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Class
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button 
            variant="outline" 
            className="w-full border-dashed"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a Class
          </Button>
        )}

        {schedules.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No classes added yet. Click "Add a Class" to enter your schedule.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
