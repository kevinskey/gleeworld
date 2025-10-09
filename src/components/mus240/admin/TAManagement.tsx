import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, UserMinus, Users } from 'lucide-react';
import { useCourseTA } from '@/hooks/useCourseTA';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TAWithProfile {
  id: string;
  user_id: string;
  course_code: string;
  assigned_at: string;
  notes: string | null;
  user_email?: string;
  user_name?: string;
}

export const TAManagement = () => {
  const { assignTA, removeTA, getAllTAs } = useCourseTA();
  const { toast } = useToast();
  const [tas, setTas] = useState<TAWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTAs = async () => {
    setLoading(true);
    try {
      const taList = await getAllTAs();
      
      // Get user profiles for each TA
      const tasWithProfiles = await Promise.all(
        taList.map(async (ta: any) => {
          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('email, full_name')
            .eq('user_id', ta.user_id)
            .single();

          return {
            ...ta,
            user_email: profile?.email || ta.user?.email || 'Unknown',
            user_name: profile?.full_name || null,
          };
        })
      );

      setTas(tasWithProfiles);
    } catch (error) {
      console.error('Error loading TAs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTAs();
  }, []);

  const handleAssignTA = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('email', email.trim())
        .single();

      if (profileError || !profile) {
        toast({
          title: 'Error',
          description: 'User not found with that email',
          variant: 'destructive',
        });
        return;
      }

      const success = await assignTA(profile.user_id, notes);
      if (success) {
        setEmail('');
        setNotes('');
        loadTAs();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign TA',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTA = async (userId: string) => {
    const success = await removeTA(userId);
    if (success) {
      loadTAs();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Teaching Assistant
          </CardTitle>
          <CardDescription>
            Assign a teaching assistant to MUS 240. TAs can edit assignments and provide feedback but cannot grade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssignTA} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@spelman.edu"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this TA assignment..."
                rows={3}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Assigning...' : 'Assign TA'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Teaching Assistants
          </CardTitle>
          <CardDescription>
            Manage teaching assistants for MUS 240
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : tas.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No teaching assistants assigned yet.
            </div>
          ) : (
            <div className="space-y-3">
              {tas.map((ta) => (
                <div
                  key={ta.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {ta.user_name || ta.user_email}
                    </div>
                    {ta.user_name && (
                      <div className="text-sm text-muted-foreground">{ta.user_email}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Assigned: {new Date(ta.assigned_at).toLocaleDateString()}
                    </div>
                    {ta.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {ta.notes}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveTA(ta.user_id)}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
