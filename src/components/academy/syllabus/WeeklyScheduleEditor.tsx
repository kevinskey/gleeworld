import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Trash2, GripVertical, Copy, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WeekItem {
  week: string;
  topics: string;
}

interface Props {
  schedule: WeekItem[];
  onChange: (schedule: WeekItem[]) => void;
  courseInfo?: {
    courseCode?: string;
    courseTitle?: string;
    credits?: number;
    term?: string;
    purpose?: string;
    textbooks?: { title: string; author: string }[];
    learningObjectives?: string[];
    gradingRequirements?: { requirement: string; weight: number }[];
  };
}

export const WeeklyScheduleEditor: React.FC<Props> = ({ schedule, onChange, courseInfo }) => {
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numWeeks, setNumWeeks] = useState(15);
  const [additionalContext, setAdditionalContext] = useState('');

  const addWeek = () => {
    const weekNumber = schedule.length + 1;
    onChange([...schedule, { week: `Week ${weekNumber}`, topics: '' }]);
  };

  const addMultipleWeeks = (count: number) => {
    const newWeeks = Array.from({ length: count }, (_, i) => ({
      week: `Week ${schedule.length + i + 1}`,
      topics: ''
    }));
    onChange([...schedule, ...newWeeks]);
  };

  const updateWeek = (index: number, field: keyof WeekItem, value: string) => {
    onChange(schedule.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeWeek = (index: number) => {
    onChange(schedule.filter((_, i) => i !== index));
  };

  const duplicateWeek = (index: number) => {
    const weekToDuplicate = schedule[index];
    const newSchedule = [...schedule];
    newSchedule.splice(index + 1, 0, {
      week: `${weekToDuplicate.week} (copy)`,
      topics: weekToDuplicate.topics
    });
    onChange(newSchedule);
  };

  const generateWithAI = async () => {
    if (!courseInfo?.courseCode || !courseInfo?.courseTitle) {
      toast.error('Please fill in the course information first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-course-outline', {
        body: {
          courseTitle: courseInfo.courseTitle,
          courseCode: courseInfo.courseCode,
          credits: courseInfo.credits || 3,
          term: courseInfo.term || 'Spring 2026',
          numWeeks,
          purpose: courseInfo.purpose || '',
          textbooks: courseInfo.textbooks || [],
          learningObjectives: courseInfo.learningObjectives || [],
          gradingRequirements: courseInfo.gradingRequirements || [],
          additionalContext
        }
      });

      if (error) {
        console.error('AI generation error:', error);
        throw new Error(error.message || 'Failed to generate outline');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.schedule && Array.isArray(data.schedule)) {
        onChange(data.schedule);
        toast.success(`Generated ${data.schedule.length}-week course outline!`);
        setShowAIDialog(false);
        setAdditionalContext('');
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error('Generation error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate outline';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Outline topics and activities for each week
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setShowAIDialog(true)}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              AI Generate
            </Button>
            <Button variant="outline" size="sm" onClick={() => addMultipleWeeks(4)}>
              <Plus className="h-4 w-4 mr-1" />
              Add 4 Weeks
            </Button>
            <Button variant="outline" size="sm" onClick={() => addMultipleWeeks(16)}>
              <Plus className="h-4 w-4 mr-1" />
              Full Semester
            </Button>
            <Button variant="outline" size="sm" onClick={addWeek}>
              <Plus className="h-4 w-4 mr-1" />
              Add Week
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedule.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No weekly schedule defined yet.</p>
              <p className="text-sm mt-1">Click "AI Generate" for an AI-powered outline or add weeks manually.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 text-muted-foreground pt-2">
                    <GripVertical className="h-4 w-4 cursor-move" />
                  </div>
                  
                  <div className="w-32 flex-shrink-0">
                    <Textarea
                      value={item.week}
                      onChange={e => updateWeek(index, 'week', e.target.value)}
                      className="font-medium text-sm resize-none"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <Textarea
                      value={item.topics}
                      onChange={e => updateWeek(index, 'topics', e.target.value)}
                      placeholder="Topics, activities, readings, assignments due..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => duplicateWeek(index)}
                      title="Duplicate week"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeWeek(index)}
                      className="text-destructive"
                      title="Remove week"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {schedule.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
              <span>{schedule.length} weeks in schedule</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onChange([])}
                className="text-destructive"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Course Outline with AI
            </DialogTitle>
            <DialogDescription>
              AI will create a comprehensive weekly schedule based on your course information, 
              learning objectives, and grading requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {courseInfo?.courseCode && courseInfo?.courseTitle ? (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{courseInfo.courseCode} - {courseInfo.courseTitle}</p>
                <p className="text-muted-foreground">{courseInfo.credits || 3} credits • {courseInfo.term || 'Spring 2026'}</p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                Please fill in the Course Info tab first for best results.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="numWeeks">Number of Weeks</Label>
              <Input
                id="numWeeks"
                type="number"
                value={numWeeks}
                onChange={e => setNumWeeks(parseInt(e.target.value) || 15)}
                min={4}
                max={20}
              />
              <p className="text-xs text-muted-foreground">
                Typical semester: 15-16 weeks including finals
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalContext">Additional Instructions (Optional)</Label>
              <Textarea
                id="additionalContext"
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="e.g., Progress through historical eras chronologically, include 2 conducting exams, schedule midterm in week 8..."
                rows={3}
              />
            </div>

            {schedule.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                ⚠️ This will replace your existing {schedule.length}-week schedule.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={generateWithAI} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Outline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
