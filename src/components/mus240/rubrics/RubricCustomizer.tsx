import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Plus, Edit2, Save, RotateCcw, Brain, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  weight: number;
  levels: {
    score: number;
    description: string;
    feedback: string;
  }[];
}

interface RubricCustomizerProps {
  onRubricChange?: (rubric: RubricCriterion[]) => void;
  initialRubric?: RubricCriterion[];
}

const DEFAULT_RUBRIC: RubricCriterion[] = [
  {
    id: '1',
    name: 'Content Understanding',
    description: 'Demonstrates comprehension of musical concepts and historical context',
    maxPoints: 5,
    weight: 25,
    levels: [
      { score: 5, description: 'Excellent', feedback: 'Shows deep understanding of musical and historical concepts' },
      { score: 4, description: 'Good', feedback: 'Shows solid understanding with minor gaps' },
      { score: 3, description: 'Satisfactory', feedback: 'Shows basic understanding' },
      { score: 2, description: 'Needs improvement', feedback: 'Limited understanding evident' },
      { score: 1, description: 'Poor', feedback: 'Little to no understanding demonstrated' }
    ]
  },
  {
    id: '2',
    name: 'Musical Analysis',
    description: 'Analyzes musical elements effectively (melody, rhythm, harmony, form)',
    maxPoints: 5,
    weight: 25,
    levels: [
      { score: 5, description: 'Excellent', feedback: 'Thorough and insightful musical analysis' },
      { score: 4, description: 'Good', feedback: 'Good analysis with some insight' },
      { score: 3, description: 'Satisfactory', feedback: 'Basic analysis present' },
      { score: 2, description: 'Needs improvement', feedback: 'Limited analytical depth' },
      { score: 1, description: 'Poor', feedback: 'Minimal or incorrect analysis' }
    ]
  },
  {
    id: '3',
    name: 'Writing Quality',
    description: 'Clear expression, proper grammar, and appropriate length (250-300 words)',
    maxPoints: 4,
    weight: 20,
    levels: [
      { score: 4, description: 'Excellent', feedback: 'Clear, well-organized writing with proper length' },
      { score: 3, description: 'Good', feedback: 'Generally clear with minor issues' },
      { score: 2, description: 'Satisfactory', feedback: 'Adequate writing quality' },
      { score: 1, description: 'Needs improvement', feedback: 'Poor organization or length issues' }
    ]
  },
  {
    id: '4',
    name: 'Critical Thinking',
    description: 'Demonstrates reflection, personal insight, and connection to course themes',
    maxPoints: 3,
    weight: 15,
    levels: [
      { score: 3, description: 'Excellent', feedback: 'Shows deep reflection and personal insight' },
      { score: 2, description: 'Good', feedback: 'Some reflection and connection evident' },
      { score: 1, description: 'Satisfactory', feedback: 'Basic reflection present' }
    ]
  },
  {
    id: '5',
    name: 'Peer Comments',
    description: 'Quality and engagement in peer commenting (≥50 words each)',
    maxPoints: 3,
    weight: 15,
    levels: [
      { score: 3, description: 'Excellent', feedback: '2+ thoughtful comments with substantial insight' },
      { score: 2, description: 'Good', feedback: '1-2 quality comments meeting length requirement' },
      { score: 1, description: 'Satisfactory', feedback: 'Comments present but may lack depth' },
      { score: 0, description: 'None', feedback: 'No qualifying peer comments found' }
    ]
  }
];

export const RubricCustomizer: React.FC<RubricCustomizerProps> = ({
  onRubricChange,
  initialRubric = DEFAULT_RUBRIC
}) => {
  const [rubric, setRubric] = useState<RubricCriterion[]>(initialRubric);
  const [editingCriterion, setEditingCriterion] = useState<RubricCriterion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveRubric = () => {
    onRubricChange?.(rubric);
    toast.success('Rubric saved successfully!');
  };

  const handleResetToDefault = () => {
    setRubric(DEFAULT_RUBRIC);
    toast.success('Rubric reset to default');
  };

  const handleEditCriterion = (criterion: RubricCriterion) => {
    setEditingCriterion({ ...criterion });
    setIsModalOpen(true);
  };

  const handleSaveCriterion = () => {
    if (!editingCriterion) return;
    
    const updatedRubric = rubric.map(c => 
      c.id === editingCriterion.id ? editingCriterion : c
    );
    setRubric(updatedRubric);
    setIsModalOpen(false);
    setEditingCriterion(null);
    toast.success('Criterion updated');
  };

  const totalPoints = rubric.reduce((sum, criterion) => sum + criterion.maxPoints, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Grading Rubric
          </h3>
          <p className="text-sm text-muted-foreground">
            Customize criteria for AI-powered journal grading • Total: {totalPoints} points
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleResetToDefault}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSaveRubric}>
            <Save className="h-4 w-4 mr-1" />
            Save Rubric
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {rubric.map((criterion, index) => (
          <Card key={criterion.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    {criterion.maxPoints} pts
                  </Badge>
                  <div>
                    <CardTitle className="text-base">{criterion.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {criterion.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditCriterion(criterion)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {criterion.levels.map((level, levelIndex) => (
                  <div
                    key={levelIndex}
                    className="p-2 rounded-lg border bg-muted/30 text-center"
                  >
                    <div className="font-medium text-sm">{level.score}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {level.description}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Criterion Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Criterion</DialogTitle>
          </DialogHeader>
          {editingCriterion && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Criterion Name</Label>
                <Input
                  id="name"
                  value={editingCriterion.name}
                  onChange={(e) => setEditingCriterion({
                    ...editingCriterion,
                    name: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingCriterion.description}
                  onChange={(e) => setEditingCriterion({
                    ...editingCriterion,
                    description: e.target.value
                  })}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="maxPoints">
                  Maximum Points: {editingCriterion.maxPoints}
                </Label>
                <Slider
                  value={[editingCriterion.maxPoints]}
                  onValueChange={([value]) => setEditingCriterion({
                    ...editingCriterion,
                    maxPoints: value
                  })}
                  max={10}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCriterion}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};