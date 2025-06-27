
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit2, Trash2, Save, X } from "lucide-react";
import { format } from "date-fns";

export interface FinanceRecord {
  id: string;
  date: string;
  type: 'stipend' | 'receipt' | 'payment' | 'debit' | 'credit';
  category: string;
  description: string;
  amount: number;
  balance: number;
  reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface FinanceTableProps {
  records: FinanceRecord[];
  loading: boolean;
  onUpdate: (id: string, updates: Partial<FinanceRecord>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export const FinanceTable = ({ records, loading, onUpdate, onDelete }: FinanceTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<FinanceRecord>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (record: FinanceRecord) => {
    setEditingId(record.id);
    setEditValues(record);
  };

  const handleSave = async (id: string) => {
    const success = await onUpdate(id, editValues);
    if (success) {
      setEditingId(null);
      setEditValues({});
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stipend': return 'bg-green-100 text-green-800';
      case 'receipt': return 'bg-blue-100 text-blue-800';
      case 'payment': return 'bg-purple-100 text-purple-800';
      case 'debit': return 'bg-red-100 text-red-800';
      case 'credit': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-2xl font-semibold text-white mb-4">Finance Records</h3>
        <div className="text-center py-8 text-white/70">Loading finance records...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-2xl font-semibold text-white mb-4">Finance Records</h3>
        <div className="text-center py-8 text-white/60">
          No finance records found. Add your first record to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="p-6 border-b border-white/10">
        <h3 className="text-2xl font-semibold text-white">Finance Records ({records.length})</h3>
        <p className="text-white/60 text-sm mt-1">Excel-like table with inline editing</p>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/80">Date</TableHead>
                <TableHead className="text-white/80">Type</TableHead>
                <TableHead className="text-white/80">Category</TableHead>
                <TableHead className="text-white/80">Description</TableHead>
                <TableHead className="text-white/80">Amount</TableHead>
                <TableHead className="text-white/80">Balance</TableHead>
                <TableHead className="text-white/80">Reference</TableHead>
                <TableHead className="text-white/80">Notes</TableHead>
                <TableHead className="text-white/80">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white">
                    {editingId === record.id ? (
                      <Input
                        type="date"
                        value={editValues.date || record.date}
                        onChange={(e) => setEditValues({...editValues, date: e.target.value})}
                        className="glass border-white/20 text-white bg-white/5"
                      />
                    ) : (
                      format(new Date(record.date), 'MMM dd, yyyy')
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingId === record.id ? (
                      <Select 
                        value={editValues.type || record.type} 
                        onValueChange={(value) => setEditValues({...editValues, type: value as any})}
                      >
                        <SelectTrigger className="glass border-white/20 text-white bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stipend">Stipend</SelectItem>
                          <SelectItem value="receipt">Receipt</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="debit">Debit</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getTypeColor(record.type)}>
                        {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                      </Badge>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-white">
                    {editingId === record.id ? (
                      <Input
                        value={editValues.category || record.category}
                        onChange={(e) => setEditValues({...editValues, category: e.target.value})}
                        className="glass border-white/20 text-white bg-white/5"
                      />
                    ) : (
                      record.category
                    )}
                  </TableCell>
                  
                  <TableCell className="text-white">
                    {editingId === record.id ? (
                      <Input
                        value={editValues.description || record.description}
                        onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                        className="glass border-white/20 text-white bg-white/5"
                      />
                    ) : (
                      record.description
                    )}
                  </TableCell>
                  
                  <TableCell className="font-medium text-white">
                    {editingId === record.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.amount || record.amount}
                        onChange={(e) => setEditValues({...editValues, amount: parseFloat(e.target.value)})}
                        className="glass border-white/20 text-white bg-white/5"
                      />
                    ) : (
                      formatCurrency(record.amount)
                    )}
                  </TableCell>
                  
                  <TableCell className="font-medium text-white">
                    {formatCurrency(record.balance)}
                  </TableCell>
                  
                  <TableCell className="text-white">
                    {editingId === record.id ? (
                      <Input
                        value={editValues.reference || record.reference || ''}
                        onChange={(e) => setEditValues({...editValues, reference: e.target.value})}
                        className="glass border-white/20 text-white bg-white/5"
                      />
                    ) : (
                      record.reference || '-'
                    )}
                  </TableCell>
                  
                  <TableCell className="text-white">
                    {editingId === record.id ? (
                      <Input
                        value={editValues.notes || record.notes || ''}
                        onChange={(e) => setEditValues({...editValues, notes: e.target.value})}
                        className="glass border-white/20 text-white bg-white/5"
                      />
                    ) : (
                      record.notes || '-'
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {editingId === record.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave(record.id)}
                            className="glass border-green-400/30 text-green-300 hover:bg-green-500/20"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            className="glass border-gray-400/30 text-gray-300 hover:bg-gray-500/20"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(record)}
                            className="glass border-blue-400/30 text-blue-300 hover:bg-blue-500/20"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={deletingId === record.id}
                                className="glass border-red-400/30 text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-card border-white/20">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Finance Record</AlertDialogTitle>
                                <AlertDialogDescription className="text-white/70">
                                  Are you sure you want to delete this finance record? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="glass border-white/20 text-white/80 hover:bg-white/10">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(record.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
