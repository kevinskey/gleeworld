import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Save, GripVertical, Scale, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Requirement {
  id?: string;
  requirement_text: string;
  weight_percentage: number;
  position: number;
}

interface Props {
  syllabusId?: string;
  gradingScale?: Record<string, string>;
  onScaleChange?: (scale: Record<string, string>) => void;
  onSave?: () => void;
}

export const RequirementsEditor: React.FC<Props> = ({ 
  syllabusId, 
  gradingScale = { 'A': '90-100', 'B': '80-89', 'C': '70-79', 'D': '60-69', 'F': 'Below 60' },
  onScaleChange,
  onSave 
}) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (syllabusId) {
      fetchRequirements();
    } else {
      setLoading(false);
    }
  }, [syllabusId]);

  const fetchRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_requirements')
        .select('*')
        .eq('syllabus_id', syllabusId)
        .order('position', { ascending: true });

      if (error) throw error;
      setRequirements((data || []) as Requirement[]);
    } catch (error) {
      console.error('Error fetching requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRequirement = () => {
    setRequirements(prev => [...prev, {
      requirement_text: '',
      weight_percentage: 0,
      position: prev.length
    }]);
  };

  const updateRequirement = (index: number, field: keyof Requirement, value: string | number) => {
    setRequirements(prev => prev.map((req, i) => 
      i === index ? { ...req, [field]: value } : req
    ));
  };

  const removeRequirement = async (index: number) => {
    const req = requirements[index];
    if (req.id) {
      try {
        await supabase
          .from('gw_course_requirements')
          .delete()
          .eq('id', req.id);
      } catch (error) {
        console.error('Error deleting requirement:', error);
      }
    }
    setRequirements(prev => prev.filter((_, i) => i !== index));
  };

  const saveRequirements = async () => {
    if (!syllabusId) {
      toast.error('Please save the syllabus first');
      return;
    }

    setSaving(true);
    try {
      for (let i = 0; i < requirements.length; i++) {
        const req = requirements[i];
        const data = {
          syllabus_id: syllabusId,
          requirement_text: req.requirement_text,
          weight_percentage: req.weight_percentage,
          position: i
        };

        if (req.id) {
          await supabase
            .from('gw_course_requirements')
            .update(data)
            .eq('id', req.id);
        } else {
          const { data: newReq } = await supabase
            .from('gw_course_requirements')
            .insert(data)
            .select()
            .single();
          if (newReq) {
            requirements[i] = newReq as Requirement;
          }
        }
      }

      setRequirements([...requirements]);
      toast.success('Grading requirements saved');
      onSave?.();
    } catch (error) {
      console.error('Error saving requirements:', error);
      toast.error('Failed to save requirements');
    } finally {
      setSaving(false);
    }
  };

  const updateScale = (grade: string, value: string) => {
    onScaleChange?.({
      ...gradingScale,
      [grade]: value
    });
  };

  const totalPercentage = requirements.reduce((sum, req) => sum + (req.weight_percentage || 0), 0);
  const isValidTotal = totalPercentage === 100;

  if (loading) {
    return <div className="p-6 text-center">Loading grading requirements...</div>;
  }

  if (!syllabusId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please save the syllabus first to add grading requirements.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grading Requirements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Grading Requirements
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define assignments and their grade weights (must total 100%)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRequirement}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button size="sm" onClick={saveRequirements} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {requirements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No grading requirements defined yet.</p>
              <p className="text-sm mt-1">Click "Add" to define grade components.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div className="col-span-1"></div>
                <div className="col-span-7">Requirement / Assignment</div>
                <div className="col-span-3 text-right">Weight</div>
                <div className="col-span-1"></div>
              </div>

              {requirements.map((req, index) => (
                <div key={req.id || index} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1 flex justify-center">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </div>
                  <div className="col-span-7">
                    <Input
                      value={req.requirement_text}
                      onChange={e => updateRequirement(index, 'requirement_text', e.target.value)}
                      placeholder="e.g., Attendance & Participation, Midterm Exam, Final Project"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <Input
                        type="number"
                        value={req.weight_percentage}
                        onChange={e => updateRequirement(index, 'weight_percentage', parseInt(e.target.value) || 0)}
                        className="pr-8"
                        min={0}
                        max={100}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRequirement(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="grid grid-cols-12 gap-4 items-center pt-4 border-t">
                <div className="col-span-1"></div>
                <div className="col-span-7 font-semibold flex items-center gap-2">
                  Total
                  {isValidTotal ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="col-span-3 text-right">
                  <span className={`font-bold text-lg ${isValidTotal ? 'text-green-600' : 'text-amber-600'}`}>
                    {totalPercentage}%
                  </span>
                </div>
                <div className="col-span-1"></div>
              </div>

              {!isValidTotal && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    Grade weights must total 100%. Current total: {totalPercentage}%
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Grading Scale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Grading Scale
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define the percentage ranges for each letter grade
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(gradingScale).map(([grade, range]) => (
              <div key={grade} className="space-y-2">
                <Label className="text-lg font-bold">{grade}</Label>
                <Input
                  value={range}
                  onChange={e => updateScale(grade, e.target.value)}
                  placeholder="e.g., 90-100"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};