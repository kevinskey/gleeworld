import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Trash2, GripVertical, Copy } from 'lucide-react';

interface WeekItem {
  week: string;
  topics: string;
}

interface Props {
  schedule: WeekItem[];
  onChange: (schedule: WeekItem[]) => void;
}

export const WeeklyScheduleEditor: React.FC<Props> = ({ schedule, onChange }) => {
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

  return (
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
        <div className="flex gap-2">
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
            <p className="text-sm mt-1">Click "Add Week" or "Full Semester" to get started.</p>
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
                
                <div className="w-28 flex-shrink-0">
                  <Input
                    value={item.week}
                    onChange={e => updateWeek(index, 'week', e.target.value)}
                    className="font-medium"
                  />
                </div>
                
                <div className="flex-1">
                  <Textarea
                    value={item.topics}
                    onChange={e => updateWeek(index, 'topics', e.target.value)}
                    placeholder="Topics, activities, readings, assignments due..."
                    rows={2}
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
  );
};
