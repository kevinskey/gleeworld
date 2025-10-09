import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCourseTeachingAssistants } from '@/hooks/useCourseTA';
import { useUsers } from '@/hooks/useUsers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

export const TAManagement = () => {
  const { tas, loading, addTA, removeTA, refetch } = useCourseTeachingAssistants('MUS240');
  const { users } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const handleAddTA = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    const result = await addTA(selectedUserId, notes);
    if (result.success) {
      toast.success('TA added successfully');
      setSelectedUserId('');
      setNotes('');
    } else {
      toast.error(result.error || 'Failed to add TA');
    }
  };

  const handleRemoveTA = async (taId: string) => {
    if (!confirm('Are you sure you want to remove this TA?')) return;

    const result = await removeTA(taId);
    if (result.success) {
      toast.success('TA removed successfully');
    } else {
      toast.error(result.error || 'Failed to remove TA');
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Unknown User';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Teaching Assistant</CardTitle>
          <CardDescription>
            Assign a teaching assistant for MUS 240. TAs can edit assignments and provide feedback but cannot grade submissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(u => !tas.some(ta => ta.user_id === u.id))
                  .map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this TA assignment..."
              rows={3}
            />
          </div>

          <Button onClick={handleAddTA} disabled={!selectedUserId}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Teaching Assistant
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Teaching Assistants</CardTitle>
          <CardDescription>
            Manage the teaching assistants for MUS 240
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : tas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No teaching assistants assigned yet
            </div>
          ) : (
            <div className="space-y-4">
              {tas.map(ta => (
                <div key={ta.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{getUserName(ta.user_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      Assigned: {new Date(ta.assigned_at).toLocaleDateString()}
                    </p>
                    {ta.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Notes: {ta.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveTA(ta.id)}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
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
