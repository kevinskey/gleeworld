import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Users, 
  DollarSign, 
  Calendar, 
  User,
  Edit3,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";

interface DuesRecord {
  id: string;
  user_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  semester: string;
  academic_year: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Join data
  gw_profiles?: {
    full_name: string;
    email: string;
  };
}

export const DuesManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [duesRecords, setDuesRecords] = useState<DuesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DuesRecord | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    due_date: '',
    semester: 'fall',
    academic_year: new Date().getFullYear().toString(),
    notes: ''
  });

  useEffect(() => {
    fetchDuesRecords();
  }, []);

  const fetchDuesRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_dues_records')
        .select(`
          *,
          gw_profiles (
            full_name,
            email
          )
        `)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setDuesRecords(data || []);
    } catch (error) {
      console.error('Error fetching dues records:', error);
      toast({
        title: "Error",
        description: "Failed to load dues records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const duesData = {
        user_id: formData.user_id,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        semester: formData.semester,
        academic_year: formData.academic_year,
        notes: formData.notes || null,
        status: 'pending' as const
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('gw_dues_records')
          .update(duesData)
          .eq('id', editingRecord.id);

        if (error) throw error;
        toast({ title: "Success", description: "Dues record updated successfully" });
      } else {
        const { error } = await supabase
          .from('gw_dues_records')
          .insert([duesData]);

        if (error) throw error;
        toast({ title: "Success", description: "Dues record created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchDuesRecords();
    } catch (error) {
      console.error('Error saving dues record:', error);
      toast({
        title: "Error",
        description: "Failed to save dues record",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      amount: '',
      due_date: '',
      semester: 'fall',
      academic_year: new Date().getFullYear().toString(),
      notes: ''
    });
    setEditingRecord(null);
  };

  const handleMarkPaid = async (id: string, paymentMethod: string = 'cash') => {
    try {
      const { error } = await supabase
        .from('gw_dues_records')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString(),
          payment_method: paymentMethod
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Dues marked as paid" });
      fetchDuesRecords();
    } catch (error) {
      console.error('Error updating dues record:', error);
      toast({
        title: "Error",
        description: "Failed to update dues record",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      case 'waived': return 'outline';
      default: return 'secondary';
    }
  };

  const getDuesStats = () => {
    const total = duesRecords.length;
    const paid = duesRecords.filter(r => r.status === 'paid').length;
    const pending = duesRecords.filter(r => r.status === 'pending').length;
    const overdue = duesRecords.filter(r => r.status === 'overdue').length;
    const totalAmount = duesRecords.reduce((sum, r) => sum + r.amount, 0);
    const paidAmount = duesRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);

    return { total, paid, pending, overdue, totalAmount, paidAmount };
  };

  const stats = getDuesStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-center">Loading dues records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bebas tracking-wide">Dues Manager</h2>
          <p className="text-muted-foreground">Track and manage member dues payments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Dues Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? 'Edit Dues Record' : 'Create Dues Record'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Member</label>
                  <Input
                    value={formData.user_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                    placeholder="Member ID or email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="50.00"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Semester</label>
                  <Select value={formData.semester} onValueChange={(value) => setFormData(prev => ({ ...prev, semester: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fall">Fall</SelectItem>
                      <SelectItem value="spring">Spring</SelectItem>
                      <SelectItem value="summer">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Academic Year</label>
                  <Input
                    value={formData.academic_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                    placeholder="2024"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this dues record"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecord ? 'Update' : 'Create'} Record
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-sm text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Expected</p>
              <p className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">${stats.paidAmount.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dues Records */}
      <div className="grid gap-4">
        {duesRecords.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Dues Records</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking member dues by creating your first record.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Record
              </Button>
            </CardContent>
          </Card>
        ) : (
          duesRecords.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {record.gw_profiles?.full_name || 'Unknown Member'}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <Badge variant={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                      <span>${record.amount.toFixed(2)}</span>
                      <span>{record.semester} {record.academic_year}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleMarkPaid(record.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingRecord(record);
                      setFormData({
                        user_id: record.user_id,
                        amount: record.amount.toString(),
                        due_date: record.due_date.split('T')[0],
                        semester: record.semester,
                        academic_year: record.academic_year,
                        notes: record.notes || ''
                      });
                      setDialogOpen(true);
                    }}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due: {new Date(record.due_date).toLocaleDateString()}
                  </div>
                  {record.paid_date && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Paid: {new Date(record.paid_date).toLocaleDateString()}
                    </div>
                  )}
                  {record.payment_method && (
                    <Badge variant="outline">{record.payment_method}</Badge>
                  )}
                </div>
                {record.notes && (
                  <p className="text-sm text-muted-foreground">{record.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};