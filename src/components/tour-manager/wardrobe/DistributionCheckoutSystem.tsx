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
import { Search, Package, User, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  size_options: string[];
  color_options: string[];
  total_quantity: number;
  available_quantity: number;
  notes?: string;
}

interface WardrobeCheckout {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  size?: string;
  color?: string;
  checked_out_at: string;
  checked_in_at?: string;
  due_date?: string;
  notes?: string;
  checked_out_by?: string;
  checked_in_by?: string;
  status: string;
  item?: WardrobeItem;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const statusColors = {
  checked_out: 'bg-blue-100 text-blue-800 border-blue-200',
  checked_in: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  lost: 'bg-gray-100 text-gray-800 border-gray-200'
} as const;

export const DistributionCheckoutSystem = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [checkouts, setCheckouts] = useState<WardrobeCheckout[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  const [checkoutForm, setCheckoutForm] = useState({
    size: '',
    color: '',
    quantity: 1,
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch wardrobe items
      const { data: itemsData, error: itemsError } = await supabase
        .from('wardrobe_items')
        .select('*')
        .order('name');

      if (itemsError) throw itemsError;

      // Fetch wardrobe checkouts with related data
      const { data: checkoutsData, error: checkoutsError } = await supabase
        .from('wardrobe_checkouts')
        .select('*')
        .order('checked_out_at', { ascending: false });

      if (checkoutsError) throw checkoutsError;

      // Fetch all users for searching
      const { data: usersData, error: usersError } = await supabase
        .from('gw_profiles')
        .select('id, user_id, full_name, email, first_name, last_name')
        .order('full_name');

      if (usersError) throw usersError;

      setItems(itemsData || []);
      setCheckouts(checkoutsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (userId: string) => {
    if (!selectedItem || !currentUser) return;

    try {
      const { error } = await supabase
        .from('wardrobe_checkouts')
        .insert({
          user_id: userId,
          item_id: selectedItem.id,
          quantity: checkoutForm.quantity,
          size: checkoutForm.size,
          color: checkoutForm.color,
          due_date: checkoutForm.due_date || null,
          notes: checkoutForm.notes,
          checked_out_by: currentUser.id,
          status: 'checked_out'
        });

      if (error) throw error;

      toast.success('Item checked out successfully');
      setShowCheckoutDialog(false);
      setSelectedItem(null);
      setCheckoutForm({
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

  const handleCheckin = async (checkoutId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('wardrobe_checkouts')
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by: currentUser.id,
          status: 'checked_in'
        })
        .eq('id', checkoutId);

      if (error) throw error;

      toast.success('Item checked in successfully');
      fetchData();
    } catch (error) {
      console.error('Error checking in item:', error);
      toast.error('Failed to check in item');
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserCheckouts = (userId: string) => {
    return checkouts.filter(checkout => 
      checkout.user_id === userId && checkout.status === 'checked_out'
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading wardrobe system...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border">
        <h2 className="text-xl font-semibold text-purple-800 mb-2">Checkout System</h2>
        <p className="text-purple-600 text-sm">
          Search for users and manage item checkouts and check-ins
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - User Search */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Search Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map(user => {
              const userCheckouts = getUserCheckouts(user.user_id);
              return (
                <Card key={user.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{user.full_name}</h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {userCheckouts.length > 0 && (
                        <p className="text-xs text-blue-600">
                          {userCheckouts.length} item(s) checked out
                        </p>
                      )}
                    </div>
                    <Checkbox
                      checked={selectedUsers.has(user.user_id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedUsers);
                        if (checked) {
                          newSelected.add(user.user_id);
                        } else {
                          newSelected.delete(user.user_id);
                        }
                        setSelectedUsers(newSelected);
                      }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Side - Items and Checkouts */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Wardrobe Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600">{item.category}</p>
                    <p className="text-xs text-gray-500">
                      Available: {item.available_quantity} / {item.total_quantity}
                    </p>
                    {item.size_options?.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Sizes: {item.size_options.join(', ')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={selectedUsers.size === 0 || item.available_quantity === 0}
                    onClick={() => {
                      setSelectedItem(item);
                      setShowCheckoutDialog(true);
                    }}
                  >
                    Checkout
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Current Checkouts for Selected Users */}
          {selectedUsers.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Current Checkouts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from(selectedUsers).map(userId => {
                  const user = users.find(u => u.user_id === userId);
                  const userCheckouts = getUserCheckouts(userId);
                  
                  if (userCheckouts.length === 0) return null;

                  return (
                    <div key={userId} className="space-y-2">
                      <h5 className="font-medium text-sm">{user?.full_name}</h5>
                      {userCheckouts.map(checkout => (
                        <div key={checkout.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{checkout.item?.name}</p>
                            <p className="text-xs text-gray-600">
                              Size: {checkout.size} | Qty: {checkout.quantity}
                              {checkout.color && ` | Color: ${checkout.color}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(checkout.checked_out_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColors[checkout.status]}>
                              {checkout.status.replace('_', ' ')}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckin(checkout.id)}
                            >
                              Check In
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium">{selectedItem.name}</h4>
                <p className="text-sm text-gray-600">{selectedItem.category}</p>
                <p className="text-sm text-gray-600">Available: {selectedItem.available_quantity}</p>
              </div>

              <div>
                <Label>Size</Label>
                <Select value={checkoutForm.size} onValueChange={(value) => setCheckoutForm({...checkoutForm, size: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedItem.size_options?.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem.color_options?.length > 0 && (
                <div>
                  <Label>Color</Label>
                  <Select value={checkoutForm.color} onValueChange={(value) => setCheckoutForm({...checkoutForm, color: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedItem.color_options.map(color => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedItem.available_quantity}
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

              <div className="space-y-2">
                <Label>Check out to selected users:</Label>
                {Array.from(selectedUsers).map(userId => {
                  const user = users.find(u => u.user_id === userId);
                  return (
                    <div key={userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{user?.full_name}</span>
                      <Button
                        size="sm"
                        onClick={() => handleCheckout(userId)}
                      >
                        Checkout
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};