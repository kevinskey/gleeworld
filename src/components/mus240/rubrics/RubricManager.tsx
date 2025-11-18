import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RubricEditor } from './RubricEditor';

interface Criterion {
  id: string;
  criterion_name: string;
  description: string;
  max_points: number;
  weight_percentage: number;
  display_order: number;
}

interface RubricGroup {
  assignment_type_id: string;
  assignment_type: string;
  criteria: Criterion[];
}

export const RubricManager = () => {
  const [rubricGroups, setRubricGroups] = useState<RubricGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRubrics();
  }, []);

  const fetchRubrics = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_rubric_criteria')
        .select('*')
        .order('assignment_type_id')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Group criteria by assignment type
      const groups: Record<string, RubricGroup> = {};
      
      (data || []).forEach((criterion) => {
        if (!groups[criterion.assignment_type_id]) {
          groups[criterion.assignment_type_id] = {
            assignment_type_id: criterion.assignment_type_id,
            assignment_type: 'Assignment Type',
            criteria: [],
          };
        }
        groups[criterion.assignment_type_id].criteria.push(criterion);
      });

      setRubricGroups(Object.values(groups));
    } catch (error) {
      console.error('Error fetching rubrics:', error);
      toast.error('Failed to load rubrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading rubrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assignment Rubrics</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define criteria and point values for consistent grading
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {rubricGroups.map((group) => {
          const totalPoints = group.criteria.reduce((sum, c) => sum + c.max_points, 0);
          const groupTitle = group.criteria.length > 0 ? getGroupTitle(group.assignment_type_id) : 'Unknown Assignment Type';
          
          return (
            <Card key={group.assignment_type_id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{groupTitle}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.criteria.length} criteria · {totalPoints} total points
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium border-b pb-2">
                    <div>Criteria</div>
                    <div>Description</div>
                    <div className="text-right">Weight</div>
                    <div className="text-right">Max Points</div>
                  </div>
                  {group.criteria.map((criterion) => (
                    <div key={criterion.id} className="grid grid-cols-4 gap-4 text-sm py-2 border-b last:border-0">
                      <div className="font-medium">{criterion.criterion_name}</div>
                      <div className="text-muted-foreground">{criterion.description}</div>
                      <div className="text-right">{criterion.weight_percentage}%</div>
                      <div className="text-right font-semibold">{criterion.max_points}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-4 gap-4 text-sm font-semibold pt-2 border-t">
                    <div>Total</div>
                    <div></div>
                    <div className="text-right">100%</div>
                    <div className="text-right">{totalPoints}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rubricGroups.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No rubrics found</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Rubric
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function getGroupTitle(assignmentTypeId: string): string {
  const titleMap: Record<string, string> = {
    '5c84ffe6-ee05-474d-83c2-60f648fd346d': 'Listening Journal Rubric',
    'acb6cd00-a2b1-44fc-99a6-7ade2b9d0d45': 'Essay Rubric',
  };
  return titleMap[assignmentTypeId] || 'Assignment Rubric';
}
