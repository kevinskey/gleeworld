import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, Package, Search, RefreshCw, Printer, 
  ExternalLink, MapPin, Clock, CheckCircle, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface Shipment {
  id: string;
  order_id: string;
  easypost_shipment_id: string | null;
  carrier: string | null;
  service: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  label_url: string | null;
  cost: number | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  gw_orders?: {
    order_number: string;
    customer_name: string;
  };
}

export const ShippingManager = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    unfulfilled: 0,
    readyForLabel: 0,
    inTransit: 0,
    delivered: 0
  });

  useEffect(() => {
    fetchShipments();
    fetchStats();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_shipments')
        .select(`
          *,
          gw_orders (order_number, customer_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch shipments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Count unfulfilled orders
      const { count: unfulfilledCount } = await supabase
        .from('gw_orders')
        .select('*', { count: 'exact', head: true })
        .eq('fulfillment_status', 'unfulfilled')
        .eq('requires_shipping', true);

      // Count shipments by status
      const { data: shipmentStats } = await supabase
        .from('gw_shipments')
        .select('status');

      const readyForLabel = shipmentStats?.filter(s => s.status === 'rated').length || 0;
      const inTransit = shipmentStats?.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length || 0;
      const delivered = shipmentStats?.filter(s => s.status === 'delivered').length || 0;

      setStats({
        unfulfilled: unfulfilledCount || 0,
        readyForLabel,
        inTransit,
        delivered
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      created: { variant: 'outline', label: 'Created' },
      rated: { variant: 'secondary', label: 'Ready for Label' },
      label_purchased: { variant: 'default', label: 'Label Purchased' },
      in_transit: { variant: 'default', label: 'In Transit' },
      out_for_delivery: { variant: 'default', label: 'Out for Delivery' },
      delivered: { variant: 'secondary', label: 'Delivered' },
      exception: { variant: 'destructive', label: 'Exception' },
      refunded: { variant: 'outline', label: 'Refunded' },
      canceled: { variant: 'outline', label: 'Canceled' }
    };
    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.gw_orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.gw_orders?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="shipments" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="shipments" className="flex items-center gap-1.5">
            <Truck className="w-4 h-4" />
            Shipments
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unfulfilled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unfulfilled}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ready for Label</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.readyForLabel}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inTransit}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.delivered}</div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order #, customer, or tracking..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="rated">Ready for Label</SelectItem>
                <SelectItem value="label_purchased">Label Purchased</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="exception">Exception</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchShipments}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Carrier/Service</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading shipments...
                      </TableCell>
                    </TableRow>
                  ) : filteredShipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No shipments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium">
                          {shipment.gw_orders?.order_number || '-'}
                        </TableCell>
                        <TableCell>{shipment.gw_orders?.customer_name || '-'}</TableCell>
                        <TableCell>
                          {shipment.carrier && shipment.service 
                            ? `${shipment.carrier} / ${shipment.service}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {shipment.tracking_code ? (
                            <a 
                              href={shipment.tracking_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {shipment.tracking_code}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                        <TableCell>
                          {shipment.cost ? `$${shipment.cost.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {shipment.label_url && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(shipment.label_url!, '_blank')}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure your origin address, package presets, and carrier preferences.
              </p>
              {/* Settings form will be implemented in Phase 2 */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
