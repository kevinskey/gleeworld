import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Check, 
  Clock, 
  Save, 
  X,
  User,
  Calendar,
  BookOpen,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from "@/hooks/use-toast";

interface JournalEntry {
  id: string;
  student_name: string;
  assignment_title: string;
  content: string;
  points_earned?: number;
  letter_grade?: string;
  points_possible: number;
  feedback?: string;
  created_at: string;
  graded_at?: string;
}

interface JournalGradingCardProps {
  journal: JournalEntry;
  onSaveGrade: (journalId: string, points: number, feedback: string) => Promise<void>;
  onGradeUpdate: () => void;
}

export const JournalGradingCard: React.FC<JournalGradingCardProps> = ({
  journal,
  onSaveGrade,
  onGradeUpdate
}) => {
  const [isGrading, setIsGrading] = useState(false);
  const [points, setPoints] = useState(journal.points_earned?.toString() || '');
  const [feedback, setFeedback] = useState(journal.feedback || '');
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isGraded = journal.points_earned !== null && journal.points_earned !== undefined;

  const handleStartGrading = () => {
    setIsGrading(true);
    setPoints(journal.points_earned?.toString() || '');
    setFeedback(journal.feedback || '');
  };

  const handleCancel = () => {
    setIsGrading(false);
    setPoints(journal.points_earned?.toString() || '');
    setFeedback(journal.feedback || '');
  };

  const handleSave = async () => {
    const pointsValue = parseFloat(points);
    
    if (isNaN(pointsValue) || pointsValue < 0 || pointsValue > journal.points_possible) {
      toast({
        title: "Invalid Points",
        description: `Points must be between 0 and ${journal.points_possible}`,
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      await onSaveGrade(journal.id, pointsValue, feedback);
      
      toast({
        title: "Grade Saved",
        description: `${journal.student_name}'s journal has been graded`,
      });
      
      setIsGrading(false);
      onGradeUpdate();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: "Error",
        description: "Failed to save grade",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    if (isGraded) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Graded
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-orange-200 text-orange-600">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="mb-6 shadow-sm border-l-4 border-l-blue-200">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <User className="h-4 w-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {journal.student_name}
                    </h3>
                  </div>
                  {getStatusBadge()}
                  
                  {/* Grade Display */}
                  {isGraded && journal.points_earned !== undefined && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-semibold">
                        {journal.points_earned.toFixed(1)}/{journal.points_possible}
                      </Badge>
                      {journal.letter_grade && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 font-semibold">
                          {journal.letter_grade}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{journal.assignment_title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Submitted: {new Date(journal.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            {/* Journal Content */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Journal Entry</h4>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {journal.content}
                </p>
              </div>
            </div>

            {/* Grading Section */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-700">Grading</h4>
                <span className="text-sm text-gray-500">Out of {journal.points_possible} points</span>
              </div>

              {isGrading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Points
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={journal.points_possible}
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                        placeholder="Enter points..."
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Feedback
                    </label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Enter feedback for the student..."
                      rows={3}
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Grade'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} disabled={saving}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {isGraded ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-700">
                          Points: {journal.points_earned}/{journal.points_possible}
                        </span>
                        {journal.graded_at && (
                          <span className="text-xs text-gray-500">
                            Graded: {new Date(journal.graded_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {journal.feedback && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Feedback:</strong> {journal.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm mb-3">This journal entry has not been graded yet</p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleStartGrading}
                    variant={isGraded ? "outline" : "default"}
                    className="w-full"
                  >
                    {isGraded ? 'Edit Grade' : 'Grade Journal'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
