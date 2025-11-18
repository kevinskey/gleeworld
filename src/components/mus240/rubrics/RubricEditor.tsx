import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  points: number;
}

interface Rubric {
  id: string;
  title: string;
  description: string;
  criteria: RubricCriteria[];
}

interface RubricEditorProps {
  rubric: Rubric;
  onUpdate: (rubric: Rubric) => void;
}

export const RubricEditor: React.FC<RubricEditorProps> = ({ rubric, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric>(rubric);

  const handleAddCriteria = () => {
    const newCriteria: RubricCriteria = {
      id: `criteria-${Date.now()}`,
      name: 'New Criteria',
      description: 'Description',
      points: 10,
    };
    setEditingRubric({
      ...editingRubric,
      criteria: [...editingRubric.criteria, newCriteria],
    });
  };

  const handleUpdateCriteria = (id: string, field: keyof RubricCriteria, value: string | number) => {
    setEditingRubric({
      ...editingRubric,
      criteria: editingRubric.criteria.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    });
  };

  const handleRemoveCriteria = (id: string) => {
    setEditingRubric({
      ...editingRubric,
      criteria: editingRubric.criteria.filter((c) => c.id !== id),
    });
  };

  const handleSave = () => {
    onUpdate(editingRubric);
    setIsOpen(false);
    toast.success('Rubric updated successfully');
  };

  const totalPoints = editingRubric.criteria.reduce((sum, c) => sum + c.points, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rubric</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rubric Info */}
          <div className="space-y-4">
            <div>
              <Label>Rubric Title</Label>
              <Input
                value={editingRubric.title}
                onChange={(e) =>
                  setEditingRubric({ ...editingRubric, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editingRubric.description}
                onChange={(e) =>
                  setEditingRubric({ ...editingRubric, description: e.target.value })
                }
              />
            </div>
          </div>

          {/* Criteria */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Grading Criteria</h3>
              <Button onClick={handleAddCriteria} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Criteria
              </Button>
            </div>

            <div className="space-y-3">
              {editingRubric.criteria.map((criteria) => (
                <Card key={criteria.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Criteria Name</Label>
                          <Input
                            value={criteria.name}
                            onChange={(e) =>
                              handleUpdateCriteria(criteria.id, 'name', e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Points</Label>
                          <Input
                            type="number"
                            value={criteria.points}
                            onChange={(e) =>
                              handleUpdateCriteria(
                                criteria.id,
                                'points',
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={criteria.description}
                          onChange={(e) =>
                            handleUpdateCriteria(criteria.id, 'description', e.target.value)
                          }
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveCriteria(criteria.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-semibold">Total Points:</span>
              <span className="text-2xl font-bold">{totalPoints}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
