import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Search,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CheckoutRecord {
  id: string;
  inventory_item_id: string;
  user_id: string;
  checked_out_by: string;
  checked_out_at: string;
  expected_return_date: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  condition_at_checkout: string;
  condition_at_checkin: string | null;
  damage_notes: string | null;
  replacement_fee: number | null;
  status: string;
  purpose: string | null;
  notes: string | null;
}

interface WardrobeCheckInOutProps {
  searchTerm: string;
}

export const WardrobeCheckInOut = ({ searchTerm }: WardrobeCheckInOutProps) => {
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false);
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutRecord | null>(null);
  const { toast } = useToast();

  const statuses = [
    { value: "checked_out", label: "Checked Out", color: "bg-blue-100 text-blue-800" },
    { value: "returned", label: "Returned", color: "bg-green-100 text-green-800" },
    { value: "overdue", label: "Overdue", color: "bg-red-100 text-red-800" },
    { value: "lost", label: "Lost", color: "bg-gray-100 text-gray-800" },
    { value: "damaged", label: "Damaged", color: "bg-orange-100 text-orange-800" },
  ];

  const purposes = ["rehearsal", "performance", "tour", "photoshoot", "event", "other"];

  useEffect(() => {
    fetchCheckouts();
  }, []);

  const fetchCheckouts = async () => {
    try {
      setLoading(true);
      // Since we don't have the checkout table yet, we'll show mock data
      const mockData: CheckoutRecord[] = [
        {
          id: "1",
          inventory_item_id: "item1",
          user_id: "user1",
          checked_out_by: "staff1",
          checked_out_at: new Date().toISOString(),
          expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          checked_in_at: null,
          checked_in_by: null,
          condition_at_checkout: "good",
          condition_at_checkin: null,
          damage_notes: null,
          replacement_fee: null,
          status: "checked_out",
          purpose: "performance",
          notes: "For Friday concert"
        }
      ];
      setCheckouts(mockData);
    } catch (error) {
      console.error('Error fetching checkouts:', error);
      toast({
        title: "Error",
        description: "Failed to load checkout records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCheckouts = checkouts.filter(checkout => {
    const matchesSearch = !searchTerm || 
      checkout.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checkout.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || checkout.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const statusObj = statuses.find(s => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800";
  };

  const isOverdue = (checkout: CheckoutRecord) => {
    if (!checkout.expected_return_date || checkout.checked_in_at) return false;
    return new Date(checkout.expected_return_date) < new Date();
  };

  const handleCheckIn = async (checkout: CheckoutRecord) => {
    setSelectedCheckout(checkout);
    setIsCheckInDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Dialog open={isCheckOutDialogOpen} onOpenChange={setIsCheckOutDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Check Out Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Check Out Wardrobe Item</DialogTitle>
                <DialogDescription>
                  Record a new item checkout
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Checkout functionality will be implemented once the checkout table is created.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Checkout Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Checkout Records ({filteredCheckouts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading checkout records...</div>
          ) : filteredCheckouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No checkout records found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Checked Out</TableHead>
                    <TableHead>Expected Return</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCheckouts.map((checkout) => (
                    <TableRow key={checkout.id}>
                      <TableCell className="font-medium">
                        Item #{checkout.inventory_item_id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          User #{checkout.user_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(checkout.checked_out_at), 'MMM dd, yyyy')}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(checkout.checked_out_at), 'h:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {checkout.expected_return_date ? (
                          <div className={`text-sm ${isOverdue(checkout) ? 'text-red-600' : ''}`}>
                            {format(new Date(checkout.expected_return_date), 'MMM dd, yyyy')}
                            {isOverdue(checkout) && (
                              <div className="flex items-center gap-1 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                Overdue
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {checkout.purpose ? (
                          <Badge variant="outline">
                            {checkout.purpose}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(checkout.status)}>
                          {checkout.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {checkout.status === "checked_out" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCheckIn(checkout)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Check In
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check In Dialog */}
      <Dialog open={isCheckInDialogOpen} onOpenChange={setIsCheckInDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Item</DialogTitle>
            <DialogDescription>
              Record the return of this wardrobe item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Check-in functionality will be implemented once the checkout table is created.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};