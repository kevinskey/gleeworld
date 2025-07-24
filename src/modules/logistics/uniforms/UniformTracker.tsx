import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Shirt, 
  Clock, 
  AlertTriangle, 
  Download,
  Plus,
  Edit,
  CheckCircle,
  Package,
  Printer
} from 'lucide-react';
import { UniformCheckoutSlipGenerator } from './slip-generator/UniformCheckoutSlip';

interface UniformAssignment {
  id: string;
  user_id: string;
  item: string;
  size: string;
  issued_date: string;
  return_due: string | null;
  returned: boolean;
  condition_notes: string;
  assigned_by: string | null;
  gw_profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
}

export const UniformTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<UniformAssignment[]>([]);
  const [userAssignments, setUserAssignments] = useState<UniformAssignment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<UniformAssignment | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    user_id: '',
    item: '',
    size: '',
    return_due: '',
    condition_notes: ''
  });

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      fetchUserAssignments();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllAssignments();
      fetchUsers();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user?.id)
        .single();
      
      setIsAdmin(data?.is_admin || data?.is_super_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchAllAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_uniform_assignments')
        .select(`
          *,
          gw_profiles!gw_uniform_assignments_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('issued_date', { ascending: false });

      if (error) throw error;
      setAssignments((data as any) || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load uniform assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_uniform_assignments')
        .select('*')
        .eq('user_id', user?.id)
        .order('issued_date', { ascending: false });

      if (error) throw error;
      setUserAssignments(data || []);
    } catch (error) {
      console.error('Error fetching user assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load your gear assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const createAssignment = async () => {
    try {
      const { error } = await supabase
        .from('gw_uniform_assignments')
        .insert({
          ...newAssignment,
          assigned_by: user?.id,
          return_due: newAssignment.return_due || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Uniform assignment created"
      });

      setShowAssignDialog(false);
      setNewAssignment({
        user_id: '',
        item: '',
        size: '',
        return_due: '',
        condition_notes: ''
      });
      
      fetchAllAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive"
      });
    }
  };

  const markReturned = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('gw_uniform_assignments')
        .update({ returned: true })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item marked as returned"
      });

      fetchAllAssignments();
      if (!isAdmin) fetchUserAssignments();
    } catch (error) {
      console.error('Error marking as returned:', error);
      toast({
        title: "Error",
        description: "Failed to update return status",
        variant: "destructive"
      });
    }
  };

  const exportData = () => {
    const data = isAdmin ? assignments : userAssignments;
    const csvContent = [
      ['User', 'Email', 'Item', 'Size', 'Issued Date', 'Return Due', 'Returned', 'Condition Notes'],
      ...data.map(assignment => [
        assignment.gw_profiles?.full_name || 'Unknown',
        assignment.gw_profiles?.email || 'Unknown',
        assignment.item,
        assignment.size,
        assignment.issued_date,
        assignment.return_due || '',
        assignment.returned ? 'Yes' : 'No',
        assignment.condition_notes
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uniform-assignments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getOverdueAssignments = () => {
    const now = new Date();
    return assignments.filter(assignment => 
      !assignment.returned && 
      assignment.return_due && 
      new Date(assignment.return_due) < now
    );
  };

  const getUserOverdueAssignments = () => {
    const now = new Date();
    return userAssignments.filter(assignment => 
      !assignment.returned && 
      assignment.return_due && 
      new Date(assignment.return_due) < now
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Uniform & Gear Tracker</h2>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage uniform assignments and track returns" : "View your assigned gear and return status"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {isAdmin && (
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Uniform Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Member</Label>
                    <Select value={newAssignment.user_id} onValueChange={(value) => setNewAssignment({...newAssignment, user_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="item">Item</Label>
                    <Input
                      id="item"
                      value={newAssignment.item}
                      onChange={(e) => setNewAssignment({...newAssignment, item: e.target.value})}
                      placeholder="e.g., Concert Dress, Music Folder, Blazer"
                    />
                  </div>

                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      value={newAssignment.size}
                      onChange={(e) => setNewAssignment({...newAssignment, size: e.target.value})}
                      placeholder="e.g., Medium, Large, N/A"
                    />
                  </div>

                  <div>
                    <Label htmlFor="return_due">Return Due Date (optional)</Label>
                    <Input
                      id="return_due"
                      type="date"
                      value={newAssignment.return_due}
                      onChange={(e) => setNewAssignment({...newAssignment, return_due: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="condition_notes">Condition Notes</Label>
                    <Textarea
                      id="condition_notes"
                      value={newAssignment.condition_notes}
                      onChange={(e) => setNewAssignment({...newAssignment, condition_notes: e.target.value})}
                      placeholder="Item condition, special instructions, etc."
                    />
                  </div>

                  <Button onClick={createAssignment} className="w-full">
                    Create Assignment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Overdue Alerts */}
      {isAdmin && getOverdueAssignments().length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{getOverdueAssignments().length} overdue returns</strong> need attention.
          </AlertDescription>
        </Alert>
      )}

      {!isAdmin && getUserOverdueAssignments().length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>You have {getUserOverdueAssignments().length} overdue return(s).</strong> Please contact an administrator.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={isAdmin ? "all" : "my-gear"}>
        <TabsList>
          {isAdmin && <TabsTrigger value="all">All Assignments</TabsTrigger>}
          <TabsTrigger value="my-gear">My Gear</TabsTrigger>
          {isAdmin && <TabsTrigger value="stats">Stats</TabsTrigger>}
        </TabsList>

        {isAdmin && (
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  All Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Shirt className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{assignment.item}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.gw_profiles?.full_name} • Size: {assignment.size} • 
                              Issued: {format(new Date(assignment.issued_date), 'MMM dd, yyyy')}
                            </div>
                            {assignment.return_due && (
                              <div className="text-sm text-muted-foreground">
                                Due: {format(new Date(assignment.return_due), 'MMM dd, yyyy')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignment.returned ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Returned
                          </Badge>
                        ) : (
                          <>
                            {assignment.return_due && new Date(assignment.return_due) < new Date() && (
                              <Badge className="bg-red-100 text-red-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              onClick={() => markReturned(assignment.id)}
                            >
                              Mark Returned
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {assignments.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No assignments yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="my-gear">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5" />
                My Assigned Gear
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Shirt className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{assignment.item}</div>
                          <div className="text-sm text-muted-foreground">
                            Size: {assignment.size} • 
                            Issued: {format(new Date(assignment.issued_date), 'MMM dd, yyyy')}
                          </div>
                          {assignment.return_due && (
                            <div className="text-sm text-muted-foreground">
                              Due: {format(new Date(assignment.return_due), 'MMM dd, yyyy')}
                            </div>
                          )}
                          {assignment.condition_notes && (
                            <div className="text-sm text-muted-foreground">
                              Notes: {assignment.condition_notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.returned ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Returned
                        </Badge>
                      ) : (
                        <>
                          {assignment.return_due && new Date(assignment.return_due) < new Date() ? (
                            <Badge className="bg-red-100 text-red-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800">
                              Active
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {userAssignments.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No gear assigned to you yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="stats">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="text-2xl font-bold">{assignments.length}</div>
                        <div className="text-sm text-muted-foreground">Total Assignments</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <div className="text-2xl font-bold">
                          {assignments.filter(a => a.returned).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Items Returned</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-red-600" />
                      <div>
                        <div className="text-2xl font-bold">{getOverdueAssignments().length}</div>
                        <div className="text-sm text-muted-foreground">Overdue Returns</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <UniformCheckoutSlipGenerator />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};