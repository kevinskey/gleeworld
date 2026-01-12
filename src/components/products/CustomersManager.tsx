import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, ShoppingBag, DollarSign, Search, Eye, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface Customer {
  customer_email: string;
  customer_name: string;
  total_orders: number;
  total_spent: number;
  first_order: string;
  last_order: string;
}

interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

export const CustomersManager = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Get aggregated customer data from orders
      const { data, error } = await supabase
        .from('gw_orders')
        .select('customer_email, customer_name, total_amount, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate by customer email
      const customerMap = new Map<string, Customer>();
      
      data?.forEach(order => {
        const email = order.customer_email;
        if (!email) return;
        
        const existing = customerMap.get(email);
        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += order.total_amount || 0;
          if (new Date(order.created_at) > new Date(existing.last_order)) {
            existing.last_order = order.created_at;
          }
          if (new Date(order.created_at) < new Date(existing.first_order)) {
            existing.first_order = order.created_at;
          }
        } else {
          customerMap.set(email, {
            customer_email: email,
            customer_name: order.customer_name || 'Unknown',
            total_orders: 1,
            total_spent: order.total_amount || 0,
            first_order: order.created_at,
            last_order: order.created_at,
          });
        }
      });

      setCustomers(Array.from(customerMap.values()).sort((a, b) => 
        new Date(b.last_order).getTime() - new Date(a.last_order).getTime()
      ));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_orders')
        .select('id, order_number, status, payment_status, total_amount, created_at')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch customer orders",
        variant: "destructive",
      });
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);

  if (loading) {
    return <div className="flex justify-center p-8">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>First Order</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.customer_email}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{customer.customer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.total_orders}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">${customer.total_spent.toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(customer.first_order), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(customer.last_order), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              fetchCustomerOrders(customer.customer_email);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Customer: {customer.customer_name}</DialogTitle>
                          </DialogHeader>
                          <CustomerDetails 
                            customer={customer} 
                            orders={customerOrders} 
                          />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a href={`mailto:${customer.customer_email}`}>
                          <Mail className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No customers found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface CustomerDetailsProps {
  customer: Customer;
  orders: CustomerOrder[];
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customer, orders }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Contact</h4>
          <p>{customer.customer_name}</p>
          <p className="text-sm text-muted-foreground">{customer.customer_email}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Summary</h4>
          <p>Total Orders: <span className="font-medium">{customer.total_orders}</span></p>
          <p>Total Spent: <span className="font-medium">${customer.total_spent.toFixed(2)}</span></p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Order History</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono">{order.order_number}</TableCell>
                <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>${order.total_amount?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
