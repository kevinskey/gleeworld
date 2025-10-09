import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, X, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TA {
  id: string;
  user_id: string;
  course_code: string;
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
  notes: string | null;
  user_email?: string;
  user_name?: string;
}

export const TAManagement = () => {
  const { user } = useAuth();
  const [tas, setTas] = useState<TA[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [courseCode, setCourseCode] = useState('MUS240');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchTAs();
  }, []);

  const fetchTAs = async () => {
    try {
      const { data, error } = await supabase
        .from('course_teaching_assistants')
        .select(`
          *,
          gw_profiles!course_teaching_assistants_user_id_fkey (
            email,
            full_name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasWithUserInfo = data?.map((ta: any) => ({
        ...ta,
        user_email: ta.gw_profiles?.email,
        user_name: ta.gw_profiles?.full_name,
      })) || [];

      setTas(tasWithUserInfo);
    } catch (error: any) {
      console.error('Error fetching TAs:', error);
      toast.error('Failed to load TAs');
    } finally {
      setLoading(false);
    }
  };

  const addTA = async () => {
    if (!userEmail.trim()) {
      toast.error('Please enter a user email');
      return;
    }

    try {
      // First, get the user_id from the email
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('email', userEmail.trim())
        .single();

      if (profileError || !profileData) {
        toast.error('User not found with that email');
        return;
      }

      const { error } = await supabase
        .from('course_teaching_assistants')
        .insert({
          user_id: profileData.user_id,
          course_code: courseCode,
          assigned_by: user?.id,
          notes: notes.trim() || null,
        });

      if (error) throw error;

      toast.success('TA added successfully');
      setUserEmail('');
      setNotes('');
      fetchTAs();
    } catch (error: any) {
      console.error('Error adding TA:', error);
      toast.error(error.message || 'Failed to add TA');
    }
  };

  const removeTA = async (taId: string) => {
    try {
      const { error } = await supabase
        .from('course_teaching_assistants')
        .update({ is_active: false })
        .eq('id', taId);

      if (error) throw error;

      toast.success('TA removed successfully');
      fetchTAs();
    } catch (error: any) {
      console.error('Error removing TA:', error);
      toast.error('Failed to remove TA');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Teaching Assistant Management
          </CardTitle>
          <CardDescription>
            Manage teaching assistants for MUS 240 and other courses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add TA Form */}
          <div className="grid gap-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Add New TA</h3>
            
            <div className="grid gap-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@spelman.edu"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="course">Course Code</Label>
              <Select value={courseCode} onValueChange={setCourseCode}>
                <SelectTrigger id="course">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MUS240">MUS 240</SelectItem>
                  <SelectItem value="MUS100">MUS 100</SelectItem>
                  <SelectItem value="MUS200">MUS 200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this TA assignment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button onClick={addTA} className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              Add TA
            </Button>
          </div>

          {/* TAs List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Current Teaching Assistants</h3>
            
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : tas.length === 0 ? (
              <p className="text-muted-foreground">No teaching assistants assigned</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tas.map((ta) => (
                    <TableRow key={ta.id}>
                      <TableCell className="font-medium">
                        {ta.user_name || 'N/A'}
                      </TableCell>
                      <TableCell>{ta.user_email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ta.course_code}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(ta.assigned_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {ta.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTA(ta.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
