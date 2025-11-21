import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Brain, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GRADED_AREAS = [
  { id: 'creativity', label: 'Creativity', description: 'Original ideas, innovative approaches' },
  { id: 'technology', label: 'Technology', description: 'Technical implementation, AI integration' },
  { id: 'writing', label: 'Writing', description: 'Documentation, analysis, written content' },
  { id: 'presentation', label: 'Presentation', description: 'Visual design, user interface' },
  { id: 'research', label: 'Research', description: 'Data gathering, literature review' },
] as const;

export const AIGroupRoleSubmission = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [details, setDetails] = useState('');

  // Fetch group membership
  const { data: groupMembership } = useQuery<{ id: string; name: string } | null>({
    queryKey: ['student-group', user?.id],
    queryFn: async () => {
      // First get the group_id from members table
      const { data: memberData } = await supabase
        .from('mus240_group_memberships')
        .select('group_id')
        .eq('member_id', user?.id)
        .maybeSingle();

      if (!memberData?.group_id) return null;

      // Then fetch group details
      const { data: groupData } = await supabase
        .from('mus240_project_groups')
        .select('id, name')
        .eq('id', memberData.group_id)
        .eq('semester', 'Fall 2024')
        .maybeSingle();

      return groupData;
    },
    enabled: !!user?.id,
  });

  // Fetch the AI Group Role assignment
  const { data: assignment } = useQuery({
    queryKey: ['ai-group-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_assignments')
        .select('id')
        .eq('title', 'AI Group Project - Role Identification')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing submission
  const { data: existingSubmission, isLoading } = useQuery({
    queryKey: ['ai-group-role-submission', user?.id, assignment?.id],
    queryFn: async () => {
      if (!assignment?.id) return null;

      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user?.id)
        .eq('assignment_id', assignment.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.file_url) {
        try {
          const submissionData = JSON.parse(data.file_url);
          setSelectedAreas(submissionData.areas || []);
          setDetails(submissionData.details || '');
        } catch (e) {
          console.error('Failed to parse submission data:', e);
        }
      }
      
      return data;
    },
    enabled: !!user?.id && !!assignment?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (selectedAreas.length === 0) {
        throw new Error('Please select at least one area');
      }

      if (!assignment?.id) {
        throw new Error('Assignment not found');
      }

      const submissionData = {
        areas: selectedAreas,
        details: details.trim(),
        groupId: groupMembership?.id,
      };

      const { data, error } = await supabase
        .from('assignment_submissions')
        .upsert({
          student_id: user?.id,
          assignment_id: assignment.id,
          file_url: JSON.stringify(submissionData),
          file_name: 'role-submission.json',
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submission_date: new Date().toISOString().split('T')[0],
        }, {
          onConflict: 'student_id,assignment_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-group-role-submission'] });
      queryClient.invalidateQueries({ queryKey: ['ai-group-role-submissions'] });
      toast({
        title: 'Submission Successful',
        description: 'Your role identification has been submitted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAreaToggle = (areaId: string) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const isSubmitted = existingSubmission?.status === 'submitted';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>AI Group Project - Role Identification</CardTitle>
            <CardDescription className="mt-1">
              Identify your contributions to the group project
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {groupMembership && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <strong>Your Group:</strong> {groupMembership.name}
            </AlertDescription>
          </Alert>
        )}

        {isSubmitted && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You have submitted your role identification. You can update your submission below.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select the areas you contributed to:
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Choose all areas where you made significant contributions to the AI Group Project.
            </p>
            <div className="space-y-3">
              {GRADED_AREAS.map((area) => (
                <div key={area.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <Checkbox
                    id={area.id}
                    checked={selectedAreas.includes(area.id)}
                    onCheckedChange={() => handleAreaToggle(area.id)}
                    disabled={submitMutation.isPending}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={area.id}
                      className="font-medium cursor-pointer"
                    >
                      {area.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {area.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="text-base font-semibold">
              Describe your specific contributions (optional)
            </Label>
            <p className="text-sm text-muted-foreground">
              Provide details about your work in each selected area.
            </p>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                selectedAreas.length === 0
                  ? "Example: I led the AI integration, developed the model training pipeline, and created the user interface mockups..."
                  : selectedAreas.includes('creativity')
                  ? "Example: I brainstormed innovative approaches, designed creative solutions, and proposed new ideas for the project..."
                  : selectedAreas.includes('technology')
                  ? "Example: I led the AI integration, developed the model training pipeline, implemented the backend systems..."
                  : selectedAreas.includes('writing')
                  ? "Example: I wrote the project documentation, conducted analysis, and created written content for the report..."
                  : selectedAreas.includes('presentation')
                  ? "Example: I designed the visual elements, created the user interface mockups, and developed the presentation slides..."
                  : selectedAreas.includes('research')
                  ? "Example: I conducted literature reviews, gathered data, and synthesized research findings..."
                  : "Describe your specific contributions to the selected areas..."
              }
              rows={6}
              disabled={submitMutation.isPending}
            />
          </div>

          {selectedAreas.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select at least one area to submit.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={selectedAreas.length === 0 || submitMutation.isPending}
            className="w-full"
            size="lg"
          >
            {submitMutation.isPending ? 'Submitting...' : isSubmitted ? 'Update Submission' : 'Submit Role Identification'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
