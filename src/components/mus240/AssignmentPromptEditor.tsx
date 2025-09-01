import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit3, Save, X } from 'lucide-react';
import { Assignment } from '@/data/mus240Assignments';
import { useToast } from '@/hooks/use-toast';

interface AssignmentPromptEditorProps {
  assignment: Assignment;
  onAssignmentUpdate: (updatedAssignment: Assignment) => void;
}

export const AssignmentPromptEditor: React.FC<AssignmentPromptEditorProps> = ({ 
  assignment, 
  onAssignmentUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAssignment, setEditedAssignment] = useState<Assignment>(assignment);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Here you would normally save to a database
      // For now, we'll just update the local state and show a toast
      onAssignmentUpdate(editedAssignment);
      setIsEditing(false);
      
      toast({
        title: "Assignment Updated",
        description: "The assignment prompt has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedAssignment(assignment);
    setIsEditing(false);
  };

  const formatInstructions = (instructions: string) => {
    return instructions.split('\n').map((line, index) => {
      if (line.startsWith('•')) {
        return (
          <li key={index} className="ml-4">
            {line.substring(1).trim()}
          </li>
        );
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return (
        <p key={index} className={line.includes('Guidelines') || line.includes('Prompt') ? 'font-semibold mt-4 mb-2' : 'mb-2'}>
          {line}
        </p>
      );
    });
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Assignment Editor (Admin Only)
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Admin Tools
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <p className="text-sm text-muted-foreground mt-1">{assignment.title}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Instructions</Label>
              <div className="text-sm text-muted-foreground mt-1 space-y-1">
                {formatInstructions(assignment.instructions)}
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div>
                <Label className="font-medium">Points:</Label>
                <span className="ml-1 text-muted-foreground">{assignment.points}</span>
              </div>
              <div>
                <Label className="font-medium">Estimated Time:</Label>
                <span className="ml-1 text-muted-foreground">{assignment.estimatedTime}</span>
              </div>
            </div>
            
            <Button 
              onClick={() => setIsEditing(true)}
              size="sm"
              className="w-full"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Assignment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedAssignment.title}
                onChange={(e) => setEditedAssignment({
                  ...editedAssignment,
                  title: e.target.value
                })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedAssignment.description}
                onChange={(e) => setEditedAssignment({
                  ...editedAssignment,
                  description: e.target.value
                })}
                className="mt-1 min-h-[60px]"
              />
            </div>
            
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={editedAssignment.instructions}
                onChange={(e) => setEditedAssignment({
                  ...editedAssignment,
                  instructions: e.target.value
                })}
                className="mt-1 min-h-[200px]"
                placeholder="Enter assignment instructions. Use bullet points with • for lists."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  value={editedAssignment.points}
                  onChange={(e) => setEditedAssignment({
                    ...editedAssignment,
                    points: parseInt(e.target.value) || 0
                  })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="estimatedTime">Estimated Time</Label>
                <Input
                  id="estimatedTime"
                  value={editedAssignment.estimatedTime}
                  onChange={(e) => setEditedAssignment({
                    ...editedAssignment,
                    estimatedTime: e.target.value
                  })}
                  className="mt-1"
                  placeholder="e.g., 45 minutes"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};