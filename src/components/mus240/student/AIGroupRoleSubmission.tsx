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
  const [areaDetails, setAreaDetails] = useState<Record<string, string>>({});

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
          setAreaDetails(submissionData.areaDetails || {});
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
        areaDetails,
        groupId: groupMembership?.id,
      };

      // Check if submission exists
      if (existingSubmission?.id) {
        // Update existing submission
        const { data, error } = await supabase
          .from('assignment_submissions')
          .update({
            file_url: JSON.stringify(submissionData),
            file_name: 'role-submission.json',
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            submission_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', existingSubmission.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new submission
        const { data, error } = await supabase
          .from('assignment_submissions')
          .insert({
            student_id: user?.id,
            assignment_id: assignment.id,
            file_url: JSON.stringify(submissionData),
            file_name: 'role-submission.json',
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            submission_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
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

  const handleAreaDetailsChange = (areaId: string, value: string) => {
    setAreaDetails(prev => ({
      ...prev,
      [areaId]: value,
    }));
  };

  const getPlaceholder = (areaId: string) => {
    switch (areaId) {
      case 'creativity':
        return "Example: I brainstormed innovative approaches, designed creative solutions, and proposed new ideas for the project...";
      case 'technology':
        return "Example: I led the AI integration, developed the model training pipeline, implemented the backend systems...";
      case 'writing':
        return "Example: I wrote the project documentation, conducted analysis, and created written content for the report...";
      case 'presentation':
        return "Example: I designed the visual elements, created the user interface mockups, and developed the presentation slides...";
      case 'research':
        return "Example: I conducted literature reviews, gathered data, and synthesized research findings...";
      default:
        return "Describe your specific contributions...";
    }
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
                <div key={area.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-start space-x-3 p-3 hover:bg-accent/50 transition-colors">
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
                  
                  {selectedAreas.includes(area.id) && (
                    <div className="px-3 pb-3 pt-0">
                      <Textarea
                        value={areaDetails[area.id] || ''}
                        onChange={(e) => handleAreaDetailsChange(area.id, e.target.value)}
                        placeholder={getPlaceholder(area.id)}
                        rows={4}
                        disabled={submitMutation.isPending}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
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
