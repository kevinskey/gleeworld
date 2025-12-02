import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
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

const ConcertTicketAdmin: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<TicketRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all ticket requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['concert-ticket-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('concert_ticket_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TicketRequest[];
    },
  });

  // Update request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      assigned_to,
    }: {
      id: string;
      status?: string;
      notes?: string;
      assigned_to?: string;
    }) => {
      const { error } = await supabase
        .from('concert_ticket_requests')
        .update({ status, notes, assigned_to })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concert-ticket-requests'] });
      toast({
        title: 'Success',
        description: 'Ticket request updated successfully',
      });
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update request',
        variant: 'destructive',
      });
      console.error('Update error:', error);
    },
  });

  const filteredRequests = requests?.filter((req) =>
    req.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.phone.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      approved: 'default',
      rejected: 'destructive',
      contacted: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <UniversalLayout>
        <LoadingSpinner size="lg" text="Loading ticket requests..." />
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="w-6 h-6 text-primary" />
              <CardTitle>Concert Ticket Requests</CardTitle>
            </div>
            <CardDescription>
              Manage and respond to concert ticket requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requests Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Tickets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests && filteredRequests.length > 0 ? (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.full_name}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {request.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {request.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{request.num_tickets}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(request)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No ticket requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ticket Request Details</DialogTitle>
              <DialogDescription>
                Review and update the ticket request
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Name
                    </Label>
                    <p className="font-medium">{selectedRequest.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      Tickets Requested
                    </Label>
                    <p className="font-medium">{selectedRequest.num_tickets}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </Label>
                    <p className="font-medium">{selectedRequest.phone}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Submitted
                    </Label>
                    <p className="font-medium">
                      {new Date(selectedRequest.created_at).toLocaleString()}
                    </p>
                  </div>
                  {selectedRequest.special_requests && (
                    <div className="space-y-1 col-span-2">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Special Requests
                      </Label>
                      <p className="text-sm border rounded-md p-3 bg-muted/50">
                        {selectedRequest.special_requests}
                      </p>
                    </div>
                  )}
                </div>

                {/* Update Form */}
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="status-update">Update Status</Label>
                    <Select
                      defaultValue={selectedRequest.status}
                      onValueChange={(value) => {
                        updateRequestMutation.mutate({
                          id: selectedRequest.id,
                          status: value,
                        });
                      }}
                    >
                      <SelectTrigger id="status-update">
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

                  <div className="space-y-2">
                    <Label htmlFor="notes">Internal Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add notes about this request..."
                      defaultValue={selectedRequest.notes || ''}
                      rows={3}
                      onBlur={(e) => {
                        if (e.target.value !== selectedRequest.notes) {
                          updateRequestMutation.mutate({
                            id: selectedRequest.id,
                            notes: e.target.value,
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigned-to">Assigned To (Email)</Label>
                    <Input
                      id="assigned-to"
                      type="email"
                      placeholder="staff@example.com"
                      defaultValue={selectedRequest.assigned_to || ''}
                      onBlur={(e) => {
                        if (e.target.value !== selectedRequest.assigned_to) {
                          updateRequestMutation.mutate({
                            id: selectedRequest.id,
                            assigned_to: e.target.value,
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </UniversalLayout>
  );
};

export default ConcertTicketAdmin;
