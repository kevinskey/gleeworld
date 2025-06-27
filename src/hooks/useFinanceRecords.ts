
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FinanceRecord } from "@/components/finance/FinanceTable";

export const useFinanceRecords = () => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Mock data for demonstration - in a real app, this would connect to Supabase
  const mockRecords: FinanceRecord[] = [
    {
      id: '1',
      date: '2024-01-15',
      type: 'stipend',
      category: 'Performance',
      description: 'January concert stipend',
      amount: 500.00,
      balance: 500.00,
      reference: 'STI-001',
      notes: 'Monthly performance stipend',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      date: '2024-01-20',
      type: 'receipt',
      category: 'Travel',
      description: 'Gas receipt for venue travel',
      amount: 45.50,
      balance: 454.50,
      reference: 'REC-001',
      notes: 'Travel to downtown venue',
      created_at: '2024-01-20T14:30:00Z',
      updated_at: '2024-01-20T14:30:00Z'
    },
    {
      id: '3',
      date: '2024-01-25',
      type: 'payment',
      category: 'Equipment',
      description: 'Microphone rental payment',
      amount: 75.00,
      balance: 379.50,
      reference: 'PAY-001',
      notes: 'Wireless mic rental for weekend',
      created_at: '2024-01-25T09:15:00Z',
      updated_at: '2024-01-25T09:15:00Z'
    }
  ];

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setRecords(mockRecords);
    } catch (err) {
      console.error('Error fetching finance records:', err);
      setError('Failed to fetch finance records');
    } finally {
      setLoading(false);
    }
  };

  const createRecord = async (recordData: Omit<FinanceRecord, 'id' | 'created_at' | 'updated_at' | 'balance'>): Promise<FinanceRecord | null> => {
    try {
      const newId = Date.now().toString();
      const currentBalance = records.length > 0 ? records[records.length - 1].balance : 0;
      
      // Calculate new balance based on transaction type
      let newBalance = currentBalance;
      switch (recordData.type) {
        case 'stipend':
        case 'credit':
          newBalance += recordData.amount;
          break;
        case 'receipt':
        case 'payment':
        case 'debit':
          newBalance -= recordData.amount;
          break;
      }

      const newRecord: FinanceRecord = {
        ...recordData,
        id: newId,
        balance: newBalance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setRecords(prev => [...prev, newRecord]);
      
      toast({
        title: "Success",
        description: "Finance record created successfully",
      });

      return newRecord;
    } catch (err) {
      console.error('Error creating finance record:', err);
      toast({
        title: "Error",
        description: "Failed to create finance record",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateRecord = async (id: string, updates: Partial<FinanceRecord>): Promise<boolean> => {
    try {
      setRecords(prev => prev.map(record => 
        record.id === id 
          ? { ...record, ...updates, updated_at: new Date().toISOString() }
          : record
      ));

      toast({
        title: "Success",
        description: "Finance record updated successfully",
      });

      return true;
    } catch (err) {
      console.error('Error updating finance record:', err);
      toast({
        title: "Error",
        description: "Failed to update finance record",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteRecord = async (id: string): Promise<boolean> => {
    try {
      setRecords(prev => prev.filter(record => record.id !== id));

      toast({
        title: "Success",
        description: "Finance record deleted successfully",
      });

      return true;
    } catch (err) {
      console.error('Error deleting finance record:', err);
      toast({
        title: "Error",
        description: "Failed to delete finance record",
        variant: "destructive",
      });
      return false;
    }
  };

  const exportToExcel = () => {
    // Simple CSV export for demonstration
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance', 'Reference', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.date,
        record.type,
        record.category,
        `"${record.description}"`,
        record.amount,
        record.balance,
        record.reference || '',
        `"${record.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Finance records exported to CSV",
    });
  };

  const importFromExcel = async (file: File) => {
    try {
      toast({
        title: "Info",
        description: "Excel import feature coming soon!",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to import Excel file",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return {
    records,
    loading,
    error,
    createRecord,
    updateRecord,
    deleteRecord,
    exportToExcel,
    importFromExcel,
    refetch: fetchRecords
  };
};
