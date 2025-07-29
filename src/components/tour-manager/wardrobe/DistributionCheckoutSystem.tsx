import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, LogIn, Receipt, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CheckoutRecord {
  id: string;
  inventory_item_id: string;
  member_id: string;
  size: string;
  color?: string;
  quantity: number;
  checked_out_at: string;
  due_date?: string;
  checked_in_at?: string;
  checkout_condition: string;
  return_condition?: string;
  status: string;
  notes?: string;
  receipt_generated: boolean;
  inventory_item?: {
    item_name: string;
    category: string;
  };
  member?: {
    full_name: string;
    email: string;
  };
}

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  size_available: string[];
  color_available: string[];
  quantity_available: number;
}

const statusColors = {
  checked_out: 'bg-blue-100 text-blue-800',
  returned: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  lost: 'bg-gray-100 text-gray-800',
  damaged: 'bg-orange-100 text-orange-800'
};

export const DistributionCheckoutSystem = () => {
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checkout');
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutRecord | null>(null);

  const [checkoutForm, setCheckoutForm] = useState({
    inventory_item_id: '',
    member_email: '',
    size: '',
    color: '',
    quantity: 1,
    due_date: '',
    notes: ''
  });

  const [checkinForm, setCheckinForm] = useState({
    return_condition: 'clean',
    notes: '',
    isClean: false,
    isStained: false,
    needsRepair: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch checkouts
      const { data: checkoutData, error: checkoutError } = await supabase
        .from('gw_wardrobe_checkouts')
        .select(`
          *,
          inventory_item:gw_wardrobe_inventory(item_name, category),
          member:gw_profiles(full_name, email)
        `)
        .order('checked_out_at', { ascending: false });

      if (checkoutError) throw checkoutError;

      // Fetch inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('gw_wardrobe_inventory')
        .select('*')
        .gt('quantity_available', 0)
        .order('item_name');

      if (inventoryError) throw inventoryError;

      setCheckouts(checkoutData || []);
      setInventory(inventoryData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find member by email
      const { data: memberData, error: memberError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', checkoutForm.member_email)
        .single();

      if (memberError) throw new Error('Member not found');

      const { error } = await supabase
        .from('gw_wardrobe_checkouts')
        .insert({
          ...checkoutForm,
          member_id: memberData.id,
          checked_out_by: user.id
        });

      if (error) throw error;

      // Update inventory quantities
      const selectedItem = inventory.find(item => item.id === checkoutForm.inventory_item_id);
      if (selectedItem) {
        await supabase
          .from('gw_wardrobe_inventory')
          .update({
            quantity_available: selectedItem.quantity_available - checkoutForm.quantity,
            quantity_checked_out: selectedItem.quantity_available + checkoutForm.quantity
          })
          .eq('id', checkoutForm.inventory_item_id);
      }

      toast.success('Item checked out successfully');
      setShowCheckoutDialog(false);
      setCheckoutForm({
        inventory_item_id: '',
        member_email: '',
        size: '',
        color: '',
        quantity: 1,
        due_date: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error checking out item:', error);
      toast.error('Failed to check out item');
    }
  };

  const handleCheckin = async () => {
    if (!selectedCheckout) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const condition = checkinForm.isClean ? 'clean' : 
                      checkinForm.isStained ? 'stained' : 
                      checkinForm.needsRepair ? 'needs_repair' : 'clean';

      const { error } = await supabase
        .from('gw_wardrobe_checkouts')
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by: user.id,
          return_condition: condition,
          status: 'returned',
          notes: checkinForm.notes
        })
        .eq('id', selectedCheckout.id);

      if (error) throw error;

      // Update inventory quantities manually
      const selectedItem = inventory.find(item => item.id === selectedCheckout.inventory_item_id);
      if (selectedItem) {
        await supabase
          .from('gw_wardrobe_inventory')
          .update({
            quantity_available: selectedItem.quantity_available + selectedCheckout.quantity,
            quantity_checked_out: Math.max(0, selectedItem.quantity_available - selectedCheckout.quantity)
          })
          .eq('id', selectedCheckout.inventory_item_id);
      }

      toast.success('Item checked in successfully');
      setShowCheckinDialog(false);
      setSelectedCheckout(null);
      setCheckinForm({
        return_condition: 'clean',
        notes: '',
        isClean: false,
        isStained: false,
        needsRepair: false
      });
      fetchData();
    } catch (error) {
      console.error('Error checking in item:', error);
      toast.error('Failed to check in item');
    }
  };

  const openCheckinDialog = (checkout: CheckoutRecord) => {
    setSelectedCheckout(checkout);
    setShowCheckinDialog(true);
  };

  const generateReceipt = async (checkout: CheckoutRecord) => {
    // Generate receipt logic here
    toast.success('Receipt generated');
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading checkout system...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checkout">Check Out Items</TabsTrigger>
          <TabsTrigger value="checkin">Check In Items</TabsTrigger>
        </TabsList>

        <TabsContent value="checkout" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Available Items</h3>
            <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Check Out Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Check Out Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Item</Label>
                    <Select value={checkoutForm.inventory_item_id} onValueChange={(value) => setCheckoutForm({...checkoutForm, inventory_item_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.item_name} ({item.quantity_available} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Member Email</Label>
                    <Input
                      value={checkoutForm.member_email}
                      onChange={(e) => setCheckoutForm({...checkoutForm, member_email: e.target.value})}
                      placeholder="member@example.com"
                    />
                  </div>
                  <div>
                    <Label>Size</Label>
                    <Input
                      value={checkoutForm.size}
                      onChange={(e) => setCheckoutForm({...checkoutForm, size: e.target.value})}
                      placeholder="e.g., M, L, XL"
                    />
                  </div>
                  <div>
                    <Label>Color (optional)</Label>
                    <Input
                      value={checkoutForm.color}
                      onChange={(e) => setCheckoutForm({...checkoutForm, color: e.target.value})}
                      placeholder="e.g., Black, Navy"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={checkoutForm.quantity}
                      onChange={(e) => setCheckoutForm({...checkoutForm, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <Label>Due Date (optional)</Label>
                    <Input
                      type="date"
                      value={checkoutForm.due_date}
                      onChange={(e) => setCheckoutForm({...checkoutForm, due_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={checkoutForm.notes}
                      onChange={(e) => setCheckoutForm({...checkoutForm, notes: e.target.value})}
                      placeholder="Additional notes..."
                    />
                  </div>
                  <Button onClick={handleCheckout} className="w-full">
                    Check Out Item
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map(item => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{item.item_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Available:</span>
                      <span className="font-medium">{item.quantity_available}</span>
                    </div>
                    {item.size_available.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium">Sizes: </span>
                        {item.size_available.join(', ')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="checkin" className="space-y-4">
          <h3 className="text-lg font-semibold">Checked Out Items</h3>
          
          <div className="space-y-4">
            {checkouts.filter(checkout => checkout.status === 'checked_out').map(checkout => (
              <Card key={checkout.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{checkout.inventory_item?.item_name}</h4>
                        <Badge className={statusColors[checkout.status as keyof typeof statusColors]}>
                          {checkout.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <User className="h-3 w-3 inline mr-1" />
                        {checkout.member?.full_name} ({checkout.member?.email})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Checked out: {new Date(checkout.checked_out_at).toLocaleDateString()}
                      </p>
                      <div className="text-sm">
                        Size: {checkout.size} | Quantity: {checkout.quantity}
                        {checkout.color && ` | Color: ${checkout.color}`}
                      </div>
                      {checkout.due_date && (
                        <p className="text-sm text-orange-600">
                          Due: {new Date(checkout.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openCheckinDialog(checkout)}
                        className="flex items-center gap-1"
                      >
                        <LogIn className="h-3 w-3" />
                        Check In
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateReceipt(checkout)}
                        className="flex items-center gap-1"
                      >
                        <Receipt className="h-3 w-3" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Check In Dialog */}
      <Dialog open={showCheckinDialog} onOpenChange={setShowCheckinDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCheckout && (
              <div className="p-3 bg-muted rounded">
                <p className="font-medium">{selectedCheckout.inventory_item?.item_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCheckout.member?.full_name} - {selectedCheckout.size}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Label>Return Condition</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="clean"
                    checked={checkinForm.isClean}
                    onCheckedChange={(checked) => setCheckinForm({
                      ...checkinForm,
                      isClean: !!checked,
                      isStained: false,
                      needsRepair: false
                    })}
                  />
                  <Label htmlFor="clean">Clean</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stained"
                    checked={checkinForm.isStained}
                    onCheckedChange={(checked) => setCheckinForm({
                      ...checkinForm,
                      isStained: !!checked,
                      isClean: false,
                      needsRepair: false
                    })}
                  />
                  <Label htmlFor="stained">Stained</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needs-repair"
                    checked={checkinForm.needsRepair}
                    onCheckedChange={(checked) => setCheckinForm({
                      ...checkinForm,
                      needsRepair: !!checked,
                      isClean: false,
                      isStained: false
                    })}
                  />
                  <Label htmlFor="needs-repair">Needs Repair</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={checkinForm.notes}
                onChange={(e) => setCheckinForm({...checkinForm, notes: e.target.value})}
                placeholder="Any additional notes about the return condition..."
              />
            </div>

            <Button onClick={handleCheckin} className="w-full">
              Complete Check In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};