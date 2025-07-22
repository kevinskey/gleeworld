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

interface MerchandiseRecord {
  id: string;
  itemName: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  saleDate: string;
  customerName?: string;
  paymentMethod: string;
  notes?: string;
}

export const MerchandiseIncomeRegister = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [merchandiseRecords, setMerchandiseRecords] = useState<MerchandiseRecord[]>([]);
  const { createRecord } = useFinanceRecords();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    pricePerUnit: '',
    saleDate: '',
    customerName: '',
    paymentMethod: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const quantity = parseInt(formData.quantity);
      const pricePerUnit = parseFloat(formData.pricePerUnit);
      const totalAmount = quantity * pricePerUnit;

      // Create finance record
      await createRecord({
        user_id: 'system', // Treasurer transactions
        date: formData.saleDate,
        type: 'credit',
        category: 'Merchandise Income',
        description: `Merchandise sale - ${formData.itemName} (${quantity} units)`,
        amount: totalAmount,
        reference: `MERCH-${Date.now()}`,
        notes: formData.notes
      });

      // Add to local merchandise records
      const newRecord: MerchandiseRecord = {
        id: `merch-${Date.now()}`,
        itemName: formData.itemName,
        quantity,
        pricePerUnit,
        totalAmount,
        saleDate: formData.saleDate,
        customerName: formData.customerName,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      };

      setMerchandiseRecords([...merchandiseRecords, newRecord]);
      setIsDialogOpen(false);
      setFormData({ 
        itemName: '', 
        quantity: '', 
        pricePerUnit: '', 
        saleDate: '', 
        customerName: '', 
        paymentMethod: '', 
        notes: '' 
      });
      
      toast({
        title: "Success",
        description: "Merchandise sale recorded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record merchandise sale",
        variant: "destructive"
      });
    }
  };

  const totalIncome = merchandiseRecords.reduce((sum, record) => sum + record.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Track merchandise sales and income</p>
          <p className="text-lg font-semibold text-primary">Total Income: ${totalIncome.toFixed(2)}</p>
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
                Record Sale
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Merchandise Sale</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    value={formData.itemName}
                    onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pricePerUnit">Price per Unit ($)</Label>
                    <Input
                      id="pricePerUnit"
                      type="number"
                      step="0.01"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({...formData, pricePerUnit: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="saleDate">Sale Date</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={formData.saleDate}
                    onChange={(e) => setFormData({...formData, saleDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerName">Customer Name (Optional)</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({...formData, paymentMethod: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                {formData.quantity && formData.pricePerUnit && (
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm font-medium">
                      Total: ${(parseInt(formData.quantity || '0') * parseFloat(formData.pricePerUnit || '0')).toFixed(2)}
                    </p>
                  </div>
                )}
                <Button type="submit" className="w-full">Record Sale</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Price/Unit</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Sale Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Payment Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merchandiseRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No merchandise sales recorded. Record your first sale to get started.
              </TableCell>
            </TableRow>
          ) : (
            merchandiseRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.itemName}</TableCell>
                <TableCell>{record.quantity}</TableCell>
                <TableCell>${record.pricePerUnit.toFixed(2)}</TableCell>
                <TableCell className="font-medium">${record.totalAmount.toFixed(2)}</TableCell>
                <TableCell>{format(new Date(record.saleDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{record.customerName || '-'}</TableCell>
                <TableCell className="capitalize">{record.paymentMethod}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};