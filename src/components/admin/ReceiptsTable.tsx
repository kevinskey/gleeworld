
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Receipt {
  id: string;
  receipt_number?: string;
  vendor_name: string;
  description: string;
  amount: number;
  purchase_date: string;
  category: string;
  template_id?: string;
  event_id?: string;
  receipt_image_url?: string;
  notes?: string;
  created_at: string;
  template?: {
    name: string;
  };
  event?: {
    title: string;
  };
  profile?: {
    full_name: string;
  };
}

interface ReceiptsTableProps {
  receipts: Receipt[];
  loading: boolean;
  onUpdate: (id: string, updates: Partial<Receipt>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export const ReceiptsTable = ({ receipts, loading, onDelete }: ReceiptsTableProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const formatCategory = (category: string) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-2xl font-semibold text-white mb-4">Receipts</h3>
        <div className="text-center py-8 text-white/70">Loading receipts...</div>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-2xl font-semibold text-white mb-4">Receipts</h3>
        <div className="text-center py-8 text-white/60">
          No receipts found. Add your first receipt to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="p-6 border-b border-white/10">
        <h3 className="text-2xl font-semibold text-white">All Receipts ({receipts.length})</h3>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/80">Date</TableHead>
                <TableHead className="text-white/80">Vendor</TableHead>
                <TableHead className="text-white/80">Description</TableHead>
                <TableHead className="text-white/80">Amount</TableHead>
                <TableHead className="text-white/80">Category</TableHead>
                <TableHead className="text-white/80">Associated With</TableHead>
                <TableHead className="text-white/80">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white">
                    {format(new Date(receipt.purchase_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {receipt.vendor_name}
                    {receipt.receipt_number && (
                      <div className="text-xs text-white/60">#{receipt.receipt_number}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-white">{receipt.description}</TableCell>
                  <TableCell className="font-medium text-white">
                    {formatCurrency(receipt.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-spelman-700/50 text-spelman-200 border-spelman-500/30">
                      {formatCategory(receipt.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {receipt.template && (
                        <Badge variant="outline" className="text-xs border-white/20 text-white/80">
                          Template: {receipt.template.name}
                        </Badge>
                      )}
                      {receipt.event && (
                        <Badge variant="outline" className="text-xs border-white/20 text-white/80">
                          Event: {receipt.event.title}
                        </Badge>
                      )}
                      {!receipt.template && !receipt.event && (
                        <span className="text-xs text-white/50">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {receipt.receipt_image_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(receipt.receipt_image_url, '_blank')}
                          className="glass border-white/20 text-white/80 hover:bg-white/10"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === receipt.id}
                            className="glass border-red-400/30 text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card border-white/20">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Delete Receipt</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/70">
                              Are you sure you want to delete this receipt from {receipt.vendor_name}? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="glass border-white/20 text-white/80 hover:bg-white/10">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(receipt.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
