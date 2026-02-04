import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  XCircle,
  Heart,
  GraduationCap,
  Mail,
  Calendar,
  Music,
  Filter,
  RefreshCw,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface RegistrationRequest {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  requested_role: 'fan' | 'alumna';
  graduation_year: number | null;
  voice_part: string | null;
  status: 'pending' | 'approved' | 'denied';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const RegistrationRequestsPanel = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [roleFilter, setRoleFilter] = useState<'all' | 'fan' | 'alumna'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [filter, roleFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      if (roleFilter !== 'all') {
        query = query.eq('requested_role', roleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests((data as RegistrationRequest[]) || []);
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      toast.error('Failed to load registration requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'deny') => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      // Call edge function to process the decision
      const { error: fnError } = await supabase.functions.invoke('gw-registration-decision', {
        body: {
          requestId: selectedRequest.id,
          action,
          adminNotes: adminNotes || null
        }
      });

      if (fnError) throw fnError;

      toast.success(`Registration ${action === 'approve' ? 'approved' : 'denied'} successfully!`);
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType(null);
      fetchRequests();
    } catch (error) {
      console.error('Error processing registration:', error);
      toast.error(`Failed to ${action} registration`);
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (request: RegistrationRequest, action: 'approve' | 'deny') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'fan') {
      return <Badge className="bg-pink-500/20 text-pink-700 border-pink-500/30"><Heart className="h-3 w-3 mr-1" />Fan</Badge>;
    }
    return <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30"><GraduationCap className="h-3 w-3 mr-1" />Alumna</Badge>;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Registration Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount} pending</Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Review and manage fan and alumna registration requests
          </p>
        </div>
        <Button onClick={fetchRequests} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Status:</span>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="pending" className="text-xs h-7">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs h-7">Approved</TabsTrigger>
              <TabsTrigger value="denied" className="text-xs h-7">Denied</TabsTrigger>
              <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Role:</span>
          <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
              <TabsTrigger value="fan" className="text-xs h-7">Fans</TabsTrigger>
              <TabsTrigger value="alumna" className="text-xs h-7">Alumnae</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No registration requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {request.email}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(request.requested_role)}</TableCell>
                    <TableCell>
                      {request.requested_role === 'alumna' && (
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          {request.graduation_year && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Class of {request.graduation_year}
                            </div>
                          )}
                          {request.voice_part && (
                            <div className="flex items-center gap-1">
                              <Music className="h-3 w-3" />
                              {request.voice_part}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      {request.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => openActionDialog(request, 'approve')}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => openActionDialog(request, 'deny')}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      )}
                      {request.status !== 'pending' && request.admin_notes && (
                        <span className="text-xs text-muted-foreground italic">
                          {request.admin_notes.substring(0, 30)}...
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => { setSelectedRequest(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <UserCheck className="h-5 w-5 text-green-600" />
              ) : (
                <UserX className="h-5 w-5 text-red-600" />
              )}
              {actionType === 'approve' ? 'Approve' : 'Deny'} Registration
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  {actionType === 'approve' 
                    ? `You are about to approve ${selectedRequest.full_name} as a ${selectedRequest.requested_role}.`
                    : `You are about to deny the registration request from ${selectedRequest.full_name}.`
                  }
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{selectedRequest.full_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Requested Role:</span>
                      <p className="font-medium capitalize">{selectedRequest.requested_role}</p>
                    </div>
                    {selectedRequest.graduation_year && (
                      <div>
                        <span className="text-muted-foreground">Graduation Year:</span>
                        <p className="font-medium">{selectedRequest.graduation_year}</p>
                      </div>
                    )}
                    {selectedRequest.voice_part && (
                      <div>
                        <span className="text-muted-foreground">Voice Part:</span>
                        <p className="font-medium">{selectedRequest.voice_part}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">
                  {actionType === 'approve' ? 'Notes (optional)' : 'Reason for denial (optional, will be included in email)'}
                </Label>
                <Textarea
                  id="adminNotes"
                  placeholder={actionType === 'approve' 
                    ? "Any notes about this approval..." 
                    : "Let the user know why their request was denied..."
                  }
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedRequest(null); setActionType(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAction(actionType!)}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'approve' ? 'Approve & Send Email' : 'Deny & Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
