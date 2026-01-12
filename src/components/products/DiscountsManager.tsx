import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Percent, Plus, Pencil, Trash2, Search, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface DiscountCode {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  min_subtotal: number;
  usage_limit: number | null;
  per_customer_limit: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export const DiscountsManager = () => {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed' | 'free_shipping',
    value: 0,
    min_subtotal: 0,
    usage_limit: '',
    per_customer_limit: 1,
    is_active: true
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts((data || []) as DiscountCode[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch discount codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const discountData = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: formData.value,
        min_subtotal: formData.min_subtotal,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_customer_limit: formData.per_customer_limit,
        is_active: formData.is_active
      };

      if (editingDiscount) {
        const { error } = await supabase
          .from('gw_discount_codes')
          .update(discountData)
          .eq('id', editingDiscount.id);

        if (error) throw error;
        toast({ title: "Success", description: "Discount code updated" });
      } else {
        const { error } = await supabase
          .from('gw_discount_codes')
          .insert([discountData]);

        if (error) throw error;
        toast({ title: "Success", description: "Discount code created" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchDiscounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;

    try {
      const { error } = await supabase
        .from('gw_discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Discount code deleted" });
      fetchDiscounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_discount_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchDiscounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percent',
      value: 0,
      min_subtotal: 0,
      usage_limit: '',
      per_customer_limit: 1,
      is_active: true
    });
    setEditingDiscount(null);
  };

  const openEditDialog = (discount: DiscountCode) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      min_subtotal: discount.min_subtotal,
      usage_limit: discount.usage_limit?.toString() || '',
      per_customer_limit: discount.per_customer_limit,
      is_active: discount.is_active
    });
    setIsDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percent': return 'Percentage';
      case 'fixed': return 'Fixed Amount';
      case 'free_shipping': return 'Free Shipping';
      default: return type;
    }
  };

  const formatValue = (type: string, value: number) => {
    switch (type) {
      case 'percent': return `${value}%`;
      case 'fixed': return `$${value.toFixed(2)}`;
      case 'free_shipping': return 'Free Shipping';
      default: return value;
    }
  };

  const filteredDiscounts = discounts.filter(d => 
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search discount codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchDiscounts}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Discount
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDiscount ? 'Edit Discount Code' : 'Create Discount Code'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="SUMMER20"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: 'percent' | 'fixed' | 'free_shipping') => setFormData({...formData, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type !== 'free_shipping' && (
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Minimum Subtotal</Label>
                <Input
                  type="number"
                  value={formData.min_subtotal}
                  onChange={(e) => setFormData({...formData, min_subtotal: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit (leave empty for unlimited)</Label>
                <Input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingDiscount ? 'Update' : 'Create'} Discount Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min. Subtotal</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading discount codes...
                  </TableCell>
                </TableRow>
              ) : filteredDiscounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No discount codes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDiscounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-mono font-bold">{discount.code}</TableCell>
                    <TableCell>{getTypeLabel(discount.type)}</TableCell>
                    <TableCell>{formatValue(discount.type, discount.value)}</TableCell>
                    <TableCell>${discount.min_subtotal.toFixed(2)}</TableCell>
                    <TableCell>
                      {discount.usage_count} / {discount.usage_limit || '∞'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={discount.is_active}
                        onCheckedChange={() => toggleActive(discount.id, discount.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(discount)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(discount.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
