import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Users, Package, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MemberStatus {
  member_name: string;
  email: string;
  voice_part?: string;
  formal_dress_size?: string;
  polo_size?: string;
  tshirt_size?: string;
  pearl_status: string;
  checked_out_items: number;
  overdue_items: number;
  last_checkout?: string;
}

interface InventoryStatus {
  item_name: string;
  category: string;
  total_quantity: number;
  available_quantity: number;
  checked_out_quantity: number;
  low_stock: boolean;
}

interface MissingItem {
  item_name: string;
  member_name: string;
  email: string;
  size: string;
  checked_out_date: string;
  days_overdue: number;
  status: string;
}

export const WardrobeReports = () => {
  const [memberStatuses, setMemberStatuses] = useState<MemberStatus[]>([]);
  const [inventoryStatuses, setInventoryStatuses] = useState<InventoryStatus[]>([]);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoicePart, setSelectedVoicePart] = useState<string>('all');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      // Fetch member statuses
      const { data: memberData, error: memberError } = await supabase
        .from('gw_member_wardrobe_profiles')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            voice_part
          )
        `);

      if (memberError) throw memberError;

      // Process member data with checkout counts
      const memberStatuses = await Promise.all(
        (memberData || []).map(async (member) => {
          const { data: checkouts } = await supabase
            .from('gw_wardrobe_checkouts')
            .select('*')
            .eq('member_id', member.user_id);

          const checkedOutItems = checkouts?.filter(c => c.status === 'checked_out').length || 0;
          const overdueItems = checkouts?.filter(c => 
            c.status === 'checked_out' && 
            c.due_date && 
            new Date(c.due_date) < new Date()
          ).length || 0;

          const lastCheckout = checkouts?.length > 0 
            ? checkouts.sort((a, b) => new Date(b.checked_out_at).getTime() - new Date(a.checked_out_at).getTime())[0].checked_out_at
            : undefined;

          return {
            member_name: member.profiles?.full_name || 'Unknown',
            email: member.profiles?.email || '',
            voice_part: member.profiles?.voice_part,
            formal_dress_size: member.formal_dress_size,
            polo_size: member.polo_size,
            tshirt_size: member.tshirt_size,
            pearl_status: member.pearl_status,
            checked_out_items: checkedOutItems,
            overdue_items: overdueItems,
            last_checkout: lastCheckout
          };
        })
      );

      // Fetch inventory status
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('gw_wardrobe_inventory')
        .select('*');

      if (inventoryError) throw inventoryError;

      const inventoryStatuses = (inventoryData || []).map(item => ({
        item_name: item.item_name,
        category: item.category,
        total_quantity: item.quantity_total,
        available_quantity: item.quantity_available,
        checked_out_quantity: item.quantity_checked_out,
        low_stock: item.quantity_available <= item.low_stock_threshold
      }));

      // Fetch missing/overdue items
      const { data: checkoutData, error: checkoutError } = await supabase
        .from('gw_wardrobe_checkouts')
        .select(`
          *,
          inventory_item:inventory_item_id (item_name),
          member:member_id (full_name, email)
        `)
        .in('status', ['checked_out', 'overdue', 'lost']);

      if (checkoutError) throw checkoutError;

      const missingItems = (checkoutData || [])
        .filter(checkout => checkout.status !== 'returned')
        .map(checkout => {
          const daysOverdue = checkout.due_date 
            ? Math.floor((new Date().getTime() - new Date(checkout.due_date).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          return {
            item_name: checkout.inventory_item?.item_name || 'Unknown',
            member_name: checkout.member?.full_name || 'Unknown',
            email: checkout.member?.email || '',
            size: checkout.size,
            checked_out_date: checkout.checked_out_at,
            days_overdue: Math.max(0, daysOverdue),
            status: checkout.status
          };
        });

      setMemberStatuses(memberStatuses);
      setInventoryStatuses(inventoryStatuses);
      setMissingItems(missingItems);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredMembers = memberStatuses.filter(member => 
    selectedVoicePart === 'all' || member.voice_part === selectedVoicePart
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Members</p>
                <p className="text-2xl font-bold">{memberStatuses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Inventory Items</p>
                <p className="text-2xl font-bold">{inventoryStatuses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Low Stock Items</p>
                <p className="text-2xl font-bold">{inventoryStatuses.filter(i => i.low_stock).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Overdue Items</p>
                <p className="text-2xl font-bold">{missingItems.filter(i => i.days_overdue > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="members">Members Status</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
          <TabsTrigger value="missing">Missing Items</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Member Wardrobe Status</h3>
            <div className="flex gap-2">
              <Select value={selectedVoicePart} onValueChange={setSelectedVoicePart}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by voice part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Voice Parts</SelectItem>
                  <SelectItem value="Soprano I">Soprano I</SelectItem>
                  <SelectItem value="Soprano II">Soprano II</SelectItem>
                  <SelectItem value="Alto I">Alto I</SelectItem>
                  <SelectItem value="Alto II">Alto II</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => exportToCSV(filteredMembers, 'wardrobe_member_status')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="grid grid-cols-1 gap-4">
                {filteredMembers.map((member, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-medium">{member.member_name}</h4>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <p className="text-sm text-muted-foreground">{member.voice_part}</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>Dress: {member.formal_dress_size || 'Not set'}</div>
                          <div>Polo: {member.polo_size || 'Not set'}</div>
                          <div>T-Shirt: {member.tshirt_size || 'Not set'}</div>
                          <div>
                            Pearls: 
                            <Badge 
                              variant={member.pearl_status === 'assigned' ? 'default' : 'secondary'} 
                              className="ml-1"
                            >
                              {member.pearl_status}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>Checked out: {member.checked_out_items}</div>
                          <div className={member.overdue_items > 0 ? 'text-red-600' : ''}>
                            Overdue: {member.overdue_items}
                          </div>
                          {member.last_checkout && (
                            <div>Last checkout: {new Date(member.last_checkout).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Inventory Status Report</h3>
            <Button
              variant="outline"
              onClick={() => exportToCSV(inventoryStatuses, 'wardrobe_inventory_status')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryStatuses.map((item, index) => (
              <Card key={index} className={item.low_stock ? 'border-orange-200 bg-orange-50' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{item.item_name}</h4>
                      {item.low_stock && (
                        <Badge variant="destructive" className="text-xs">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {item.category.replace('_', ' ')}
                    </p>
                    <div className="space-y-1 text-sm">
                      <div>Total: {item.total_quantity}</div>
                      <div>Available: {item.available_quantity}</div>
                      <div>Checked out: {item.checked_out_quantity}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="missing" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Missing & Unreturned Items</h3>
            <Button
              variant="outline"
              onClick={() => exportToCSV(missingItems, 'wardrobe_missing_items')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="space-y-4">
            {missingItems.map((item, index) => (
              <Card key={index} className={item.days_overdue > 0 ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-medium">{item.item_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.member_name} ({item.email})
                      </p>
                      <div className="text-sm space-y-1">
                        <div>Size: {item.size}</div>
                        <div>Checked out: {new Date(item.checked_out_date).toLocaleDateString()}</div>
                        {item.days_overdue > 0 && (
                          <div className="text-red-600 font-medium">
                            {item.days_overdue} days overdue
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={item.status === 'lost' ? 'destructive' : item.days_overdue > 0 ? 'destructive' : 'secondary'}
                    >
                      {item.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {missingItems.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No missing items</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All items are accounted for
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="measurements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Member Measurements Report</h3>
            <Button
              variant="outline"
              onClick={() => {
                const measurementData = memberStatuses.filter(m => 
                  m.formal_dress_size || m.polo_size || m.tshirt_size
                );
                exportToCSV(measurementData, 'wardrobe_measurements');
              }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="space-y-4">
            {['Soprano I', 'Soprano II', 'Alto I', 'Alto II'].map(voicePart => {
              const sectionMembers = memberStatuses.filter(m => m.voice_part === voicePart);
              
              return (
                <Card key={voicePart}>
                  <CardHeader>
                    <CardTitle className="text-lg">{voicePart}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectionMembers.map((member, index) => (
                        <div key={index} className="space-y-1 text-sm">
                          <div className="font-medium">{member.member_name}</div>
                          <div>Dress: {member.formal_dress_size || 'Not measured'}</div>
                          <div>Polo: {member.polo_size || 'Not measured'}</div>
                          <div>T-Shirt: {member.tshirt_size || 'Not measured'}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};