import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Target, Plus, Trash2, GripVertical, Link2, Lightbulb, CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LearningObjective {
  id?: string;
  syllabus_id?: string;
  course_id: string;
  objective_text: string;
  category: string;
  bloom_level: string;
  position: number;
  is_measurable: boolean;
}

interface RubricCriterion {
  id?: string;
  course_id: string;
  learning_objective_id?: string;
  assignment_type: string;
  criterion_name: string;
  description: string;
  weight_percentage: number;
  max_points: number;
  position: number;
}

interface Props {
  courseId: string;
  syllabusId?: string;
}

const BLOOM_LEVELS = [
  { value: 'remember', label: 'Remember', description: 'Recall facts and basic concepts' },
  { value: 'understand', label: 'Understand', description: 'Explain ideas or concepts' },
  { value: 'apply', label: 'Apply', description: 'Use information in new situations' },
  { value: 'analyze', label: 'Analyze', description: 'Draw connections among ideas' },
  { value: 'evaluate', label: 'Evaluate', description: 'Justify a decision or course of action' },
  { value: 'create', label: 'Create', description: 'Produce new or original work' }
];

const CATEGORIES = [
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'skills', label: 'Skills' },
  { value: 'attitudes', label: 'Attitudes' },
  { value: 'competencies', label: 'Competencies' }
];

const ASSIGNMENT_TYPES = [
  'Written Assignment',
  'Oral Presentation',
  'Performance/Demonstration',
  'Exam/Quiz',
  'Project',
  'Discussion',
  'Research Paper',
  'Portfolio'
];

export const LearningObjectivesManager: React.FC<Props> = ({ courseId, syllabusId }) => {
  const [objectives, setObjectives] = useState<LearningObjective[]>([]);
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRubricDialog, setShowRubricDialog] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<LearningObjective | null>(null);
  const [newCriterion, setNewCriterion] = useState<Partial<RubricCriterion>>({
    assignment_type: '',
    criterion_name: '',
    description: '',
    weight_percentage: 10,
    max_points: 100
  });

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      const { data: objData, error: objError } = await supabase
        .from('gw_learning_objectives' as any)
        .select('*')
        .eq('course_id', courseId)
        .order('position');

      if (objError) throw objError;
      setObjectives((objData as any[]) || []);
      
      const { data: critData, error: critError } = await supabase
        .from('gw_rubric_criteria' as any)
        .select('*')
        .eq('course_id', courseId)
        .order('position');
      
      if (!critError && critData) {
        setRubricCriteria((critData as any[]) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load learning objectives');
    } finally {
      setLoading(false);
    }
  };

  const addObjective = () => {
    const newObjective: LearningObjective = {
      course_id: courseId,
      syllabus_id: syllabusId,
      objective_text: '',
      category: 'knowledge',
      bloom_level: 'understand',
      position: objectives.length,
      is_measurable: true
    };
    setObjectives([...objectives, newObjective]);
  };

  const updateObjective = (index: number, field: keyof LearningObjective, value: any) => {
    setObjectives(objectives.map((obj, i) => 
      i === index ? { ...obj, [field]: value } : obj
    ));
  };

  const removeObjective = async (index: number) => {
    const objective = objectives[index];
    if (objective.id) {
      try {
        const { error } = await supabase
          .from('gw_learning_objectives' as any)
          .delete()
          .eq('id', objective.id);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting objective:', error);
        toast.error('Failed to delete objective');
        return;
      }
    }
    setObjectives(objectives.filter((_, i) => i !== index));
    toast.success('Objective removed');
  };

  const saveObjectives = async () => {
    try {
      for (const objective of objectives) {
        const objData = {
          course_id: courseId,
          syllabus_id: syllabusId,
          objective_text: objective.objective_text,
          category: objective.category,
          bloom_level: objective.bloom_level,
          position: objective.position,
          is_measurable: objective.is_measurable
        };

        if (objective.id) {
          const { error } = await supabase
            .from('gw_learning_objectives' as any)
            .update(objData)
            .eq('id', objective.id);
          if (error) throw error;
        } else {
          const { data: inserted, error } = await supabase
            .from('gw_learning_objectives' as any)
            .insert(objData)
            .select()
            .single();
          if (error) throw error;
          objective.id = (inserted as any).id;
        }
      }
      toast.success('Learning objectives saved');
      fetchData();
    } catch (error) {
      console.error('Error saving objectives:', error);
      toast.error('Failed to save objectives');
    }
  };

  const openRubricDialog = (objective: LearningObjective) => {
    setSelectedObjective(objective);
    setNewCriterion({
      assignment_type: '',
      criterion_name: objective.objective_text.substring(0, 50),
      description: '',
      weight_percentage: 10,
      max_points: 100
    });
    setShowRubricDialog(true);
  };

  const createRubricFromObjective = async () => {
    if (!selectedObjective?.id || !newCriterion.assignment_type) {
      toast.error('Please select an assignment type');
      return;
    }

    try {
      const { error } = await supabase
        .from('gw_rubric_criteria' as any)
        .insert({
          course_id: courseId,
          learning_objective_id: selectedObjective.id,
          assignment_type: newCriterion.assignment_type,
          criterion_name: newCriterion.criterion_name,
          description: newCriterion.description || selectedObjective.objective_text,
          weight_percentage: newCriterion.weight_percentage,
          max_points: newCriterion.max_points,
          position: rubricCriteria.length
        });

      if (error) throw error;

      toast.success('Rubric criterion created and linked to objective');
      setShowRubricDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error creating rubric:', error);
      toast.error('Failed to create rubric criterion');
    }
  };

  const getLinkedCriteria = (objectiveId?: string) => {
    if (!objectiveId) return [];
    return rubricCriteria.filter(c => c.learning_objective_id === objectiveId);
  };

  if (loading) {
    return <div className="p-6 text-center">Loading objectives...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Objectives
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define measurable outcomes students will achieve
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addObjective}>
              <Plus className="h-4 w-4 mr-1" />
              Add Objective
            </Button>
            <Button onClick={saveObjectives}>
              Save All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {objectives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No learning objectives defined yet.</p>
              <p className="text-sm mt-1">Click "Add Objective" to get started.</p>
            </div>
          ) : (
            objectives.map((objective, index) => {
              const linkedCriteria = getLinkedCriteria(objective.id);
              
              return (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground pt-2">
                      <GripVertical className="h-4 w-4 cursor-move" />
                      <span className="font-medium">{index + 1}.</span>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <Textarea
                        value={objective.objective_text}
                        onChange={e => updateObjective(index, 'objective_text', e.target.value)}
                        placeholder="By the end of the course, students will be able to..."
                        rows={2}
                      />
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={objective.category}
                            onValueChange={v => updateObjective(index, 'category', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Bloom's Level</Label>
                          <Select
                            value={objective.bloom_level}
                            onValueChange={v => updateObjective(index, 'bloom_level', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOOM_LEVELS.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  <div>
                                    <div>{level.label}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-2 flex items-end gap-2">
                          {objective.id && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openRubricDialog(objective)}
                              className="flex-1"
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              Link to Rubric
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeObjective(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Linked Rubric Criteria */}
                      {linkedCriteria.length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Linked Rubric Criteria:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {linkedCriteria.map(criterion => (
                              <Badge key={criterion.id} variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {criterion.assignment_type}: {criterion.criterion_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Writing Effective Learning Objectives</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Start with action verbs (demonstrate, analyze, create, evaluate)</li>
                <li>Make them measurable and specific</li>
                <li>Align with Bloom's Taxonomy levels</li>
                <li>Link objectives to rubric criteria for consistent assessment</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Rubric Dialog */}
      <Dialog open={showRubricDialog} onOpenChange={setShowRubricDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Create Rubric Criterion
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Linked Objective:</p>
              <p className="text-sm">{selectedObjective?.objective_text}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Select
                value={newCriterion.assignment_type}
                onValueChange={v => setNewCriterion({ ...newCriterion, assignment_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment type..." />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Criterion Name</Label>
              <Input
                value={newCriterion.criterion_name}
                onChange={e => setNewCriterion({ ...newCriterion, criterion_name: e.target.value })}
                placeholder="e.g., Critical Analysis"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newCriterion.description}
                onChange={e => setNewCriterion({ ...newCriterion, description: e.target.value })}
                placeholder="Describe what this criterion assesses..."
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weight (%)</Label>
                <Input
                  type="number"
                  value={newCriterion.weight_percentage}
                  onChange={e => setNewCriterion({ ...newCriterion, weight_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Points</Label>
                <Input
                  type="number"
                  value={newCriterion.max_points}
                  onChange={e => setNewCriterion({ ...newCriterion, max_points: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRubricDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createRubricFromObjective}>
              <ArrowRight className="h-4 w-4 mr-1" />
              Create Criterion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
