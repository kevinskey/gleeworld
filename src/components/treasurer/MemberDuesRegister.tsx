import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download } from 'lucide-react';
import { useFinanceRecords } from '@/hooks/useFinanceRecords';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DuesRecord {
  id: string;
  memberName: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'paid' | 'pending' | 'overdue';
  semester: string;
  notes?: string;
}

export const MemberDuesRegister = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [duesRecords, setDuesRecords] = useState<DuesRecord[]>([]);
  const { createRecord } = useFinanceRecords();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    memberName: '',
    amount: '',
    dueDate: '',
    semester: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create finance record
      await createRecord({
        user_id: 'system', // Treasurer transactions
        date: formData.dueDate,
        type: 'credit',
        category: 'Member Dues',
        description: `Member dues - ${formData.memberName} (${formData.semester})`,
        amount: parseFloat(formData.amount),
        reference: `DUES-${Date.now()}`,
        notes: formData.notes
      });

      // Add to local dues records
      const newRecord: DuesRecord = {
        id: `dues-${Date.now()}`,
        memberName: formData.memberName,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        semester: formData.semester,
        status: 'pending',
        notes: formData.notes
      };

      setDuesRecords([...duesRecords, newRecord]);
      setIsDialogOpen(false);
      setFormData({ memberName: '', amount: '', dueDate: '', semester: '', notes: '' });
      
      toast({
        title: "Success",
        description: "Member dues record added successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add dues record",
        variant: "destructive"
      });
    }
  };

  const markAsPaid = (recordId: string) => {
    setDuesRecords(records => 
      records.map(record => 
        record.id === recordId 
          ? { ...record, status: 'paid' as const, paymentDate: format(new Date(), 'yyyy-MM-dd') }
          : record
      )
    );
  };

  const getStatusColor = (status: DuesRecord['status']) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Track member dues payments and status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Member Dues
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Member Dues Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="memberName">Member Name</Label>
                  <Input
                    id="memberName"
                    value={formData.memberName}
                    onChange={(e) => setFormData({...formData, memberName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Select value={formData.semester} onValueChange={(value) => setFormData({...formData, semester: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                      <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                      <SelectItem value="Summer 2025">Summer 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">Add Dues Record</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member Name</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {duesRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No dues records found. Add your first record to get started.
              </TableCell>
            </TableRow>
          ) : (
            duesRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.memberName}</TableCell>
                <TableCell>${record.amount.toFixed(2)}</TableCell>
                <TableCell>{format(new Date(record.dueDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{record.semester}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                </TableCell>
                <TableCell>
                  {record.paymentDate ? format(new Date(record.paymentDate), 'MMM dd, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  {record.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => markAsPaid(record.id)}>
                      Mark Paid
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};