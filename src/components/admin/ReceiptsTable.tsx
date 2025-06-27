
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Trash2, ExternalLink } from "lucide-react";
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
      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading receipts...</div>
        </CardContent>
      </Card>
    );
  }

  if (receipts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No receipts found. Add your first receipt to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Receipts ({receipts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Associated With</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>
                    {format(new Date(receipt.purchase_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {receipt.vendor_name}
                    {receipt.receipt_number && (
                      <div className="text-xs text-gray-500">#{receipt.receipt_number}</div>
                    )}
                  </TableCell>
                  <TableCell>{receipt.description}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(receipt.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {formatCategory(receipt.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {receipt.template && (
                        <Badge variant="outline" className="text-xs">
                          Template: {receipt.template.name}
                        </Badge>
                      )}
                      {receipt.event && (
                        <Badge variant="outline" className="text-xs">
                          Event: {receipt.event.title}
                        </Badge>
                      )}
                      {!receipt.template && !receipt.event && (
                        <span className="text-xs text-gray-500">None</span>
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
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this receipt from {receipt.vendor_name}? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(receipt.id)}
                              className="bg-red-600 hover:bg-red-700"
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
      </CardContent>
    </Card>
  );
};
