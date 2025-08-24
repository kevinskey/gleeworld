import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, Music, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SheetMusic } from '@/hooks/useSheetMusicLibrary';

interface AssignmentCreatorProps {
  selectedScore?: SheetMusic | null;
  onAssignmentCreated?: () => void;
}

export const AssignmentCreator: React.FC<AssignmentCreatorProps> = ({
  selectedScore,
  onAssignmentCreated
}) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [formData, setFormData] = useState({
    title: selectedScore?.title || '',
    description: '',
    points_possible: 100,
    target_type: 'all_members',
    target_value: '',
    grading_period: 'quarter1'
  });

  const handleCreateAssignment = async () => {
    if (!selectedScore?.xml_content) {
      toast({
        title: "No XML Content",
        description: "Please select a score with XML content to create an assignment.",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "Due Date Required",
        description: "Please select a due date for the assignment.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the assignment.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-sight-reading-assignment', {
        body: {
          title: formData.title,
          description: formData.description,
          due_date: dueDate.toISOString(),
          points_possible: formData.points_possible,
          sheet_music_id: selectedScore.id,
          musicxml_content: selectedScore.xml_content,
          target_type: formData.target_type,
          target_value: formData.target_value || null,
          grading_period: formData.grading_period
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: "Assignment Created",
          description: data.message,
        });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          points_possible: 100,
          target_type: 'all_members',
          target_value: '',
          grading_period: 'quarter1'
        });
        setDueDate(undefined);
        
        onAssignmentCreated?.();
      } else {
        throw new Error(data.error || 'Failed to create assignment');
      }

    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Create Assignment from XML
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedScore ? (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <Music className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900 dark:text-green-100">Selected Score</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>{selectedScore.title}</strong>
              {selectedScore.composer && ` by ${selectedScore.composer}`}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {selectedScore.key_signature} • {selectedScore.time_signature} • {selectedScore.difficulty_level}
            </p>
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Please select a score with XML content from the Score Library first.
            </p>
          </div>
        )}

        <div className="grid gap-4">
          <div>
            <Label htmlFor="assignment-title">Assignment Title *</Label>
            <Input
              id="assignment-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter assignment title"
            />
          </div>

          <div>
            <Label htmlFor="assignment-description">Description</Label>
            <Textarea
              id="assignment-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional assignment instructions..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="points">Points Possible</Label>
              <Input
                id="points"
                type="number"
                value={formData.points_possible}
                onChange={(e) => setFormData({ ...formData, points_possible: parseInt(e.target.value) || 100 })}
                min="1"
                max="1000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target-type">Assign To</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value) => setFormData({ ...formData, target_type: value, target_value: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_members">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Members
                    </div>
                  </SelectItem>
                  <SelectItem value="voice_part">Voice Part</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.target_type === 'voice_part' && (
              <div>
                <Label htmlFor="voice-part">Voice Part</Label>
                <Select
                  value={formData.target_value}
                  onValueChange={(value) => setFormData({ ...formData, target_value: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soprano">Soprano</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="tenor">Tenor</SelectItem>
                    <SelectItem value="bass">Bass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="grading-period">Grading Period</Label>
            <Select
              value={formData.grading_period}
              onValueChange={(value) => setFormData({ ...formData, grading_period: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarter1">Quarter 1</SelectItem>
                <SelectItem value="quarter2">Quarter 2</SelectItem>
                <SelectItem value="quarter3">Quarter 3</SelectItem>
                <SelectItem value="quarter4">Quarter 4</SelectItem>
                <SelectItem value="semester1">Semester 1</SelectItem>
                <SelectItem value="semester2">Semester 2</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleCreateAssignment}
            disabled={!selectedScore?.xml_content || !dueDate || !formData.title.trim() || isCreating}
            className="w-full"
          >
            {isCreating ? "Creating Assignment..." : "Create Assignment for Members"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};