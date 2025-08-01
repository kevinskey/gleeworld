import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, User, Package, Calendar, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
}

interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  size_options: string[];
  color_options: string[];
  available_quantity: number;
}

interface CheckoutItem {
  item: WardrobeItem;
  quantity: number;
  size?: string;
  color?: string;
}

export const WardrobeCheckoutSystem = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<CheckoutItem[]>([]);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Search for users
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, email, first_name, last_name, full_name, avatar_url, role')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      const usersWithId = data?.map(profile => ({
        id: profile.user_id,
        email: profile.email || '',
        first_name: profile.first_name,
        last_name: profile.last_name,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role
      })) || [];
      
      setUsers(usersWithId);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearchingUsers(false);
    }
  };

  // Fetch available wardrobe items
  const fetchWardrobeItems = async () => {
    try {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .gt('available_quantity', 0)
        .order('category', { ascending: true });

      if (error) throw error;
      setWardrobeItems(data || []);
    } catch (error) {
      console.error('Error fetching wardrobe items:', error);
      toast.error('Failed to load wardrobe items');
    }
  };

  useEffect(() => {
    fetchWardrobeItems();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setSearchTerm('');
    setUsers([]);
  };

  const toggleItemSelection = (item: WardrobeItem, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, { 
        item, 
        quantity: 1,
        size: item.size_options?.[0],
        color: item.color_options?.[0]
      }]);
    } else {
      setSelectedItems(prev => prev.filter(selected => selected.item.id !== item.id));
    }
  };

  const updateSelectedItem = (itemId: string, field: 'quantity' | 'size' | 'color', value: string | number) => {
    setSelectedItems(prev => prev.map(selected => 
      selected.item.id === itemId 
        ? { ...selected, [field]: value }
        : selected
    ));
  };

  const isItemSelected = (itemId: string) => {
    return selectedItems.some(selected => selected.item.id === itemId);
  };

  const handleCheckout = async () => {
    if (!selectedUser || selectedItems.length === 0) {
      toast.error('Please select a user and at least one item');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create checkout records
      const checkoutPromises = selectedItems.map(async (selectedItem) => {
        // Check if there's enough quantity available
        if (selectedItem.quantity > selectedItem.item.available_quantity) {
          throw new Error(`Not enough ${selectedItem.item.name} available. Requested: ${selectedItem.quantity}, Available: ${selectedItem.item.available_quantity}`);
        }

        const { data: checkout, error } = await supabase
          .from('gw_wardrobe_checkouts')
          .insert({
            inventory_item_id: selectedItem.item.id,
            member_id: selectedUser.id,
            checked_out_by: user.id,
            size: selectedItem.size,
            color: selectedItem.color,
            quantity: selectedItem.quantity,
            due_date: expectedReturnDate || null,
            notes: checkoutNotes,
            checked_out_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return { checkout, selectedItem };
      });

      const checkoutResults = await Promise.all(checkoutPromises);

      // Send email confirmation
      const emailItems = selectedItems.map(item => ({
        name: item.item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity
      }));

      const { data: checkedOutByProfile } = await supabase
        .from('gw_profiles')
        .select('first_name, last_name, full_name')
        .eq('user_id', user.id)
        .single();

      const checkedOutByName = checkedOutByProfile?.full_name || 
        `${checkedOutByProfile?.first_name || ''} ${checkedOutByProfile?.last_name || ''}`.trim() ||
        'Wardrobe Manager';

      await supabase.functions.invoke('send-checkout-confirmation', {
        body: {
          checkoutId: checkoutResults[0].checkout.id,
          recipientEmail: selectedUser.email,
          recipientName: selectedUser.full_name || `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim(),
          items: emailItems,
          checkedOutBy: checkedOutByName,
          checkoutDate: new Date().toISOString(),
          expectedReturnDate: expectedReturnDate
        }
      });

      toast.success(`Successfully checked out ${selectedItems.length} item(s) to ${selectedUser.full_name || selectedUser.email}`);
      
      // Reset form
      setSelectedUser(null);
      setSelectedItems([]);
      setExpectedReturnDate('');
      setCheckoutNotes('');
      
      // Refresh wardrobe items to show updated quantities
      fetchWardrobeItems();

    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast.error(error.message || 'Failed to complete checkout');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: User) => {
    return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  };

  const getUserInitials = (user: User) => {
    const name = getUserDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">Wardrobe Checkout System</h2>
        <p className="text-blue-600 text-sm">
          Search for users, select items to check out, and send email confirmations
        </p>
      </div>

      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search User
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedUser ? (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              
              {searchingUsers && (
                <div className="text-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Searching users...</p>
                </div>
              )}
              
              {users.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => selectUser(user)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{getUserDisplayName(user)}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.role && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {user.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedUser.avatar_url} />
                <AvatarFallback>{getUserInitials(selectedUser)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{getUserDisplayName(selectedUser)}</h3>
                <p className="text-muted-foreground">{selectedUser.email}</p>
                {selectedUser.role && (
                  <Badge variant="outline" className="mt-1">
                    {selectedUser.role}
                  </Badge>
                )}
              </div>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Change User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Items */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Available Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wardrobeItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isItemSelected(item.id)}
                      onCheckedChange={(checked) => toggleItemSelection(item, checked as boolean)}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                      <p className="text-sm text-green-600">Available: {item.available_quantity}</p>
                      
                      {isItemSelected(item.id) && (
                        <div className="mt-3 space-y-2">
                          <div>
                            <label className="text-xs font-medium">Quantity:</label>
                            <Input
                              type="number"
                              min="1"
                              max={item.available_quantity}
                              value={selectedItems.find(s => s.item.id === item.id)?.quantity || 1}
                              onChange={(e) => updateSelectedItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="mt-1"
                            />
                          </div>
                          
                          {item.size_options && item.size_options.length > 0 && (
                            <div>
                              <label className="text-xs font-medium">Size:</label>
                              <Select 
                                value={selectedItems.find(s => s.item.id === item.id)?.size}
                                onValueChange={(value) => updateSelectedItem(item.id, 'size', value)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.size_options.map(size => (
                                    <SelectItem key={size} value={size}>{size}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {item.color_options && item.color_options.length > 0 && (
                            <div>
                              <label className="text-xs font-medium">Color:</label>
                              <Select 
                                value={selectedItems.find(s => s.item.id === item.id)?.color}
                                onValueChange={(value) => updateSelectedItem(item.id, 'color', value)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.color_options.map(color => (
                                    <SelectItem key={color} value={color}>{color}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout Details */}
      {selectedUser && selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Checkout Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Expected Return Date (Optional)</label>
              <Input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                placeholder="Add any special notes or instructions..."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Checkout Summary:</h4>
              <ul className="space-y-1 text-sm">
                {selectedItems.map((item, index) => (
                  <li key={index}>
                    • {item.item.name} 
                    {item.size && ` (Size: ${item.size})`}
                    {item.color && ` (Color: ${item.color})`}
                    {` - Quantity: ${item.quantity}`}
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              onClick={handleCheckout}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing Checkout...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Complete Checkout & Send Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};