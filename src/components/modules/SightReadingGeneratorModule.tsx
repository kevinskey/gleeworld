import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Music, Plus, Send, Eye, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';

export const SightReadingGeneratorModule = ({ user, isFullPage = false }: ModuleProps) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [assignmentData, setAssignmentData] = useState({
    title: '',
    description: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
    points_possible: 100,
    assignment_type: 'sight_reading' as const,
    grading_period: 'week_1' as const,
    target_type: 'all_members',
    target_value: '',
    notes: '',
    exercise_config: {
      key: 'C',
      time_signature: '4/4',
      tempo: 120,
      difficulty: 'intermediate',
      num_measures: 8
    }
  });

  const createAssignment = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create assignments",
        variant: "destructive"
      });
      return;
    }

    if (!assignmentData.title.trim()) {
      toast({
        title: "Error", 
        description: "Assignment title is required",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create the assignment in the database
      const { data: assignment, error } = await supabase
        .from('gw_sight_reading_assignments')
        .insert({
          title: assignmentData.title,
          description: assignmentData.description,
          assignment_type: assignmentData.assignment_type,
          due_date: assignmentData.due_date.toISOString(),
          grading_period: assignmentData.grading_period,
          points_possible: assignmentData.points_possible,
          assigned_by: user.id,
          target_type: assignmentData.target_type,
          target_value: assignmentData.target_value,
          notes: `${assignmentData.notes}\n\nExercise Config: ${JSON.stringify(assignmentData.exercise_config)}`,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Assignment Created!",
        description: `"${assignmentData.title}" has been assigned to students and will appear in their Sight Reading Studio.`
      });

      // Reset form
      setAssignmentData({
        ...assignmentData,
        title: '',
        description: '',
        notes: ''
      });
      setShowForm(false);

    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const exercisePreview = `Sight Reading Exercise - ${assignmentData.exercise_config.key} ${assignmentData.exercise_config.key.includes('#') || assignmentData.exercise_config.key.includes('b') ? 'Major' : 'Major'}, ${assignmentData.exercise_config.time_signature} time, ${assignmentData.exercise_config.tempo} BPM, ${assignmentData.exercise_config.num_measures} measures`;

  return (
    <ModuleWrapper
      id="sight-reading-generator"
      title="Sight Reading Assignment Creator"
      description="Create AI-graded sight reading assignments for students"
      icon={Music}
      iconColor="blue"
      fullPage={isFullPage}
    >
      <div className="space-y-6">
        {!showForm ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Create sight reading assignments that will automatically appear in students' Sight Reading Studio.
              Assignments are automatically graded using AI when students submit their recordings.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 border rounded-lg">
                <Eye className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <h4 className="font-medium">AI Grading</h4>
                <p className="text-muted-foreground">Automatic evaluation of pitch accuracy and rhythm</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h4 className="font-medium">Student Tracking</h4>
                <p className="text-muted-foreground">Monitor progress in student dashboards</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Music className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <h4 className="font-medium">Customizable</h4>
                <p className="text-muted-foreground">Set key, tempo, difficulty, and requirements</p>
              </div>
            </div>

            <Button onClick={() => setShowForm(true)} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create New Assignment
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Create Sight Reading Assignment</h3>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Assignment Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    value={assignmentData.title}
                    onChange={(e) => setAssignmentData({...assignmentData, title: e.target.value})}
                    placeholder="e.g., Weekly Sight Reading #5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={assignmentData.description}
                    onChange={(e) => setAssignmentData({...assignmentData, description: e.target.value})}
                    placeholder="Instructions for students..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <DateTimePicker
                    value={assignmentData.due_date}
                    onChange={(date) => date && setAssignmentData({...assignmentData, due_date: date})}
                  />
                </div>

                <div>
                  <Label htmlFor="points">Points Possible</Label>
                  <Input
                    id="points"
                    type="number"
                    value={assignmentData.points_possible}
                    onChange={(e) => setAssignmentData({...assignmentData, points_possible: parseInt(e.target.value) || 100})}
                    min="1"
                    max="200"
                  />
                </div>
              </div>

              {/* Exercise Configuration */}
              <div className="space-y-4">
                <h4 className="font-medium">Exercise Configuration</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="key">Key</Label>
                    <Select 
                      value={assignmentData.exercise_config.key}
                      onValueChange={(value) => setAssignmentData({
                        ...assignmentData, 
                        exercise_config: {...assignmentData.exercise_config, key: value}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="C">C Major</SelectItem>
                        <SelectItem value="G">G Major</SelectItem>
                        <SelectItem value="D">D Major</SelectItem>
                        <SelectItem value="A">A Major</SelectItem>
                        <SelectItem value="E">E Major</SelectItem>
                        <SelectItem value="F">F Major</SelectItem>
                        <SelectItem value="Bb">B♭ Major</SelectItem>
                        <SelectItem value="Eb">E♭ Major</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="time_sig">Time Signature</Label>
                    <Select 
                      value={assignmentData.exercise_config.time_signature}
                      onValueChange={(value) => setAssignmentData({
                        ...assignmentData, 
                        exercise_config: {...assignmentData.exercise_config, time_signature: value}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4/4">4/4</SelectItem>
                        <SelectItem value="3/4">3/4</SelectItem>
                        <SelectItem value="2/4">2/4</SelectItem>
                        <SelectItem value="6/8">6/8</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tempo">Tempo (BPM)</Label>
                    <Input
                      id="tempo"
                      type="number"
                      value={assignmentData.exercise_config.tempo}
                      onChange={(e) => setAssignmentData({
                        ...assignmentData, 
                        exercise_config: {...assignmentData.exercise_config, tempo: parseInt(e.target.value) || 120}
                      })}
                      min="60"
                      max="180"
                    />
                  </div>

                  <div>
                    <Label htmlFor="measures">Number of Measures</Label>
                    <Input
                      id="measures"
                      type="number"
                      value={assignmentData.exercise_config.num_measures}
                      onChange={(e) => setAssignmentData({
                        ...assignmentData, 
                        exercise_config: {...assignmentData.exercise_config, num_measures: parseInt(e.target.value) || 8}
                      })}
                      min="4"
                      max="16"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select 
                    value={assignmentData.exercise_config.difficulty}
                    onValueChange={(value) => setAssignmentData({
                      ...assignmentData, 
                      exercise_config: {...assignmentData.exercise_config, difficulty: value}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exercise Preview */}
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Exercise Preview:</Label>
                  <p className="text-sm text-muted-foreground mt-1">{exercisePreview}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={createAssignment} disabled={isCreating}>
                <Send className="h-4 w-4 mr-2" />
                {isCreating ? 'Creating...' : 'Create Assignment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModuleWrapper>
  );
};