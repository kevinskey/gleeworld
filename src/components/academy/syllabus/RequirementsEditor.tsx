import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface Requirement {
  id?: string;
  syllabus_id?: string;
  requirement_text: string;
  weight_percentage: number;
  position: number;
}
interface Props {
  syllabusId?: string;
  onSave?: () => void;
}
export const RequirementsEditor: React.FC<Props> = ({
  syllabusId,
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
    if (!syllabusId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('gw_course_requirements' as any).select('*').eq('syllabus_id', syllabusId).order('position');
      if (error) throw error;
      setRequirements(data as any[] || []);
    } catch (error) {
      console.error('Error fetching requirements:', error);
    } finally {
      setLoading(false);
    }
  };
  const addRequirement = () => {
    setRequirements([...requirements, {
      syllabus_id: syllabusId,
      requirement_text: '',
      weight_percentage: 0,
      position: requirements.length
    }]);
  };
  const updateRequirement = (index: number, field: keyof Requirement, value: any) => {
    setRequirements(requirements.map((req, i) => i === index ? {
      ...req,
      [field]: value
    } : req));
  };
  const removeRequirement = async (index: number) => {
    const requirement = requirements[index];
    if (requirement.id) {
      try {
        const {
          error
        } = await supabase.from('gw_course_requirements' as any).delete().eq('id', requirement.id);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting requirement:', error);
        toast.error('Failed to delete requirement');
        return;
      }
    }
    setRequirements(requirements.filter((_, i) => i !== index));
    toast.success('Requirement removed');
  };
  const saveRequirements = async () => {
    if (!syllabusId) {
      toast.error('Please save the syllabus first');
      onSave?.();
      return;
    }
    setSaving(true);
    try {
      for (const requirement of requirements) {
        const reqData = {
          syllabus_id: syllabusId,
          requirement_text: requirement.requirement_text,
          weight_percentage: requirement.weight_percentage,
          position: requirement.position
        };
        if (requirement.id) {
          const {
            error
          } = await supabase.from('gw_course_requirements' as any).update(reqData).eq('id', requirement.id);
          if (error) throw error;
        } else {
          const {
            data: inserted,
            error
          } = await supabase.from('gw_course_requirements' as any).insert(reqData).select().single();
          if (error) throw error;
          requirement.id = (inserted as any).id;
        }
      }
      toast.success('Requirements saved');
    } catch (error) {
      console.error('Error saving requirements:', error);
      toast.error('Failed to save requirements');
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="p-6 text-center">Loading requirements...</div>;
  }
  if (!syllabusId) {
    return <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Save the syllabus first to add course requirements.</p>
          <Button className="mt-4" onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Syllabus
          </Button>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Assignments & Requirements
          </CardTitle>
          <p className="text-sm mt-1 text-secondary-foreground">
            Define what students are required to complete
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRequirement}>
            <Plus className="h-4 w-4 mr-1" />
            Add Requirement
          </Button>
          <Button size="sm" onClick={saveRequirements} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {requirements.length === 0 ? <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No requirements defined yet.</p>
            <p className="text-sm mt-1">Click "Add Requirement" to define course assignments.</p>
          </div> : requirements.map((requirement, index) => <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground pt-2">
                <GripVertical className="h-4 w-4 cursor-move" />
                <span className="font-medium w-6">{index + 1}.</span>
              </div>
              
              <div className="flex-1">
                <Textarea value={requirement.requirement_text} onChange={e => updateRequirement(index, 'requirement_text', e.target.value)} placeholder="Describe the requirement or assignment..." rows={2} />
              </div>
              
              <div className="w-24">
                <div className="relative">
                  <Input type="number" value={requirement.weight_percentage} onChange={e => updateRequirement(index, 'weight_percentage', parseInt(e.target.value) || 0)} className="pr-8" placeholder="0" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
              
              <Button variant="ghost" size="icon" onClick={() => removeRequirement(index)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>)}
      </CardContent>
    </Card>;
};