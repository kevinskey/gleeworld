import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Ticket, Mail, Phone, User, Calendar, MessageSquare, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ModuleWrapper } from './ModuleWrapper';

interface TicketRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  num_tickets: number;
  special_requests: string | null;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export const ConcertTicketRequestsModule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<TicketRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all ticket requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['concert-ticket-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concert_ticket_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TicketRequest[];
    },
  });

  // Update request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TicketRequest> }) => {
      const { error } = await supabase
        .from('concert_ticket_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concert-ticket-requests'] });
      toast({
        title: 'Success',
        description: 'Ticket request updated successfully',
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update ticket request',
        variant: 'destructive',
      });
      console.error('Update error:', error);
    },
  });

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!requests) return { total: 0, pending: 0, contacted: 0, approved: 0, rejected: 0, totalTickets: 0 };
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      contacted: requests.filter(r => r.status === 'contacted').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      totalTickets: requests.reduce((sum, r) => sum + r.num_tickets, 0),
    };
  }, [requests]);

  // Filter requests based on search and status
  const filteredRequests = requests?.filter((request) => {
    const matchesSearch =
      request.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateRequest = (updates: Partial<TicketRequest>) => {
    if (!selectedRequest) return;
    updateRequestMutation.mutate({ id: selectedRequest.id, updates });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      contacted: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <ModuleWrapper title="Concert Ticket Requests" icon={Ticket}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper title="Concert Ticket Requests" icon={Ticket}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <Badge className="mt-2 bg-blue-100 text-blue-800">Total</Badge>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <Badge className="mt-2 bg-yellow-100 text-yellow-800">Pending</Badge>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.contacted}</div>
            <Badge className="mt-2 bg-purple-100 text-purple-800">Contacted</Badge>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.approved}</div>
            <Badge className="mt-2 bg-green-100 text-green-800">Approved</Badge>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <Badge className="mt-2 bg-red-100 text-red-800">Rejected</Badge>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <Badge className="mt-2 bg-indigo-100 text-indigo-800">Total Tickets</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Ticket Requests</CardTitle>
          <CardDescription>
            View and manage concert ticket requests from the public
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests && filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {request.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {request.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {request.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{request.num_tickets}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsDialogOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No ticket requests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket Request Details</DialogTitle>
            <DialogDescription>View and manage this ticket request</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <p className="text-sm mt-1">{selectedRequest.full_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm mt-1">{selectedRequest.email}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm mt-1">{selectedRequest.phone}</p>
                </div>
                <div>
                  <Label>Number of Tickets</Label>
                  <p className="text-sm mt-1">{selectedRequest.num_tickets}</p>
                </div>
              </div>

              {selectedRequest.special_requests && (
                <div>
                  <Label>Special Requests</Label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">
                    {selectedRequest.special_requests}
                  </p>
                </div>
              )}

              {/* Management Fields */}
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(value) =>
                      setSelectedRequest({ ...selectedRequest, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={selectedRequest.notes || ''}
                    onChange={(e) =>
                      setSelectedRequest({ ...selectedRequest, notes: e.target.value })
                    }
                    placeholder="Add internal notes about this request..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Input
                    id="assigned_to"
                    value={selectedRequest.assigned_to || ''}
                    onChange={(e) =>
                      setSelectedRequest({ ...selectedRequest, assigned_to: e.target.value })
                    }
                    placeholder="Staff member handling this request"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleUpdateRequest({
                      status: selectedRequest.status,
                      notes: selectedRequest.notes,
                      assigned_to: selectedRequest.assigned_to,
                    })
                  }
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModuleWrapper>
  );
};
