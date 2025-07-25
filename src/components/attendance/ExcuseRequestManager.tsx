import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  MessageSquare,
  Calendar,
  User,
  AlertCircle,
  Eye,
  Send,
  Mail,
  MessageCircle,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExcuseRequest {
  id: string;
  user_id: string;
  event_id?: string | null;
  event_date: string;
  event_title: string;
  reason: string;
  status: string; // Changed to string to match database
  submitted_at: string;
  forwarded_by?: string | null;
  forwarded_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  secretary_message?: string | null;
  secretary_message_sent_at?: string | null;
  secretary_message_sent_by?: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

export const ExcuseRequestManager = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ExcuseRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [gwProfile, setGwProfile] = useState<any>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageToUser, setMessageToUser] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const isSecretary = gwProfile?.exec_board_role === 'secretary' || 
                     (gwProfile?.special_roles && gwProfile.special_roles.includes('secretary'));
  const isAdmin = gwProfile?.is_admin || gwProfile?.is_super_admin;
  const canManageRequests = isSecretary || isAdmin;

  const loadGwProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setGwProfile(data);
    } catch (error) {
      console.error('Error loading gw profile:', error);
    }
  };

  const loadExcuseRequests = async () => {
    if (!user || !canManageRequests) return;

    try {
      setLoading(true);
      
      // First get excuse requests
      let requestQuery = supabase
        .from('excuse_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      // Filter based on user role
      if (isSecretary && !isAdmin) {
        // Secretaries see pending, returned, and forwarded requests
        requestQuery = requestQuery.in('status', ['pending', 'returned', 'forwarded']);
      }

      const { data: requestsData, error: requestsError } = await requestQuery;

      if (requestsError) throw requestsError;

      // Get user profiles for the request users
      const userIds = requestsData?.map(req => req.user_id) || [];
      
      if (userIds.length === 0) {
        setExcuseRequests([]);
        return;
      }

      // Try to get profiles from gw_profiles first
      const { data: gwProfilesData, error: gwProfilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (gwProfilesError) {
        console.error('Error loading gw profiles:', gwProfilesError);
      }

      // For users not found in gw_profiles, get from profiles table
      const foundUserIds = gwProfilesData?.map(p => p.user_id) || [];
      const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
      
      let profilesData: any[] = [];
      if (missingUserIds.length > 0) {
        const { data: fallbackProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', missingUserIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
        } else {
          // Convert profiles format to match gw_profiles
          profilesData = fallbackProfiles?.map(p => ({
            user_id: p.id,
            full_name: p.full_name,
            email: p.email
          })) || [];
        }
      }

      // Combine both profile sources
      const allProfiles = [...(gwProfilesData || []), ...profilesData];

      // Combine the data
      const requestsWithProfiles = requestsData?.map(request => {
        const userProfile = allProfiles.find(profile => profile.user_id === request.user_id);
        return {
          ...request,
          user_profile: userProfile || { full_name: 'Unknown User', email: 'unknown@example.com' }
        };
      }) || [];

      setExcuseRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error loading excuse requests:', error);
      toast({
        title: "Error",
        description: "Failed to load excuse requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const forwardRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('excuse_requests')
        .update({
          status: 'forwarded',
          forwarded_by: user?.id,
          forwarded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to user
      const selectedRequestData = excuseRequests.find(req => req.id === requestId);
      if (selectedRequestData) {
        try {
          await supabase.functions.invoke('send-excuse-notification', {
            body: {
              requestId: requestId,
              userId: selectedRequestData.user_id,
              status: 'forwarded'
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }

      toast({
        title: "Success",
        description: "Excuse request forwarded to director for approval",
      });

      loadExcuseRequests();
    } catch (error) {
      console.error('Error forwarding request:', error);
      toast({
        title: "Error",
        description: "Failed to forward excuse request",
        variant: "destructive",
      });
    }
  };

  const reviewRequest = async (requestId: string, status: 'approved' | 'denied') => {
    try {
      const { error } = await supabase
        .from('excuse_requests')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to user
      const selectedRequestData = excuseRequests.find(req => req.id === requestId);
      if (selectedRequestData) {
        try {
          await supabase.functions.invoke('send-excuse-notification', {
            body: {
              requestId: requestId,
              userId: selectedRequestData.user_id,
              status: status,
              adminNotes: adminNotes
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }

      toast({
        title: "Success",
        description: `Excuse request ${status}`,
      });

      setSelectedRequest(null);
      setAdminNotes('');
      loadExcuseRequests();
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast({
        title: "Error",
        description: "Failed to review excuse request",
        variant: "destructive",
      });
    }
  };

  const sendMessageToUser = async (requestId: string) => {
    if (!messageToUser.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingMessage(true);
      
      // Update the request with secretary message and change status to 'returned'
      const { error } = await supabase
        .from('excuse_requests')
        .update({
          status: 'returned',
          secretary_message: messageToUser,
          secretary_message_sent_at: new Date().toISOString(),
          secretary_message_sent_by: user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to user
      const selectedRequestData = excuseRequests.find(req => req.id === requestId);
      if (selectedRequestData) {
        try {
          await supabase.functions.invoke('send-excuse-notification', {
            body: {
              requestId: requestId,
              userId: selectedRequestData.user_id,
              status: 'returned',
              message: messageToUser
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
          // Don't fail the whole operation if notification fails
        }
      }

      toast({
        title: "Success",
        description: "Request returned to student with comments",
      });

      setMessageDialogOpen(false);
      setMessageToUser('');
      setSelectedRequest(null);
      loadExcuseRequests();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to return request with comments",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('excuse_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Excuse request deleted successfully",
      });
      
      loadExcuseRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete excuse request",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadGwProfile();
  }, [user]);

  useEffect(() => {
    if (canManageRequests) {
      loadExcuseRequests();
    }
  }, [user, canManageRequests]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'returned':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><MessageCircle className="h-3 w-3 mr-1" />Returned</Badge>;
      case 'forwarded':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Send className="h-3 w-3 mr-1" />Forwarded</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filterRequestsByStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return excuseRequests.filter(req => req.status === 'pending');
      case 'returned':
        return excuseRequests.filter(req => req.status === 'returned');
      case 'forwarded':
        return excuseRequests.filter(req => req.status === 'forwarded');
      case 'reviewed':
        return excuseRequests.filter(req => ['approved', 'denied'].includes(req.status));
      default:
        return excuseRequests;
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to manage excuse requests.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canManageRequests) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">Only secretaries and admins can manage excuse requests.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Excuse Request Management
            <Badge variant="outline" className="ml-2">
              {isAdmin ? 'Admin' : 'Secretary'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending ({filterRequestsByStatus('pending').length})
              </TabsTrigger>
              <TabsTrigger value="returned" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Returned ({filterRequestsByStatus('returned').length})
              </TabsTrigger>
              <TabsTrigger value="forwarded" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Forwarded ({filterRequestsByStatus('forwarded').length})
              </TabsTrigger>
              <TabsTrigger value="reviewed" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Reviewed ({filterRequestsByStatus('reviewed').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filterRequestsByStatus('pending').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending excuse requests
                </div>
              ) : (
                filterRequestsByStatus('pending').map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-yellow-400">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {request.user_profile?.full_name || request.user_profile?.email}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            {request.event_title} - {format(new Date(request.event_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Reason:</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{request.reason}</p>
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                        <span>Submitted: {format(new Date(request.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setMessageDialogOpen(true);
                          }}
                          className="flex items-center gap-1"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Return with comments
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => forwardRequest(request.id)}
                          className="flex items-center gap-1"
                        >
                          <ArrowRight className="h-3 w-3" />
                          Forward to Doc for Approval
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteRequest(request.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="returned" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filterRequestsByStatus('returned').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No returned excuse requests
                </div>
              ) : (
                filterRequestsByStatus('returned').map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-orange-400">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {request.user_profile?.full_name || request.user_profile?.email}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            {request.event_title} - {format(new Date(request.event_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Reason:</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{request.reason}</p>
                      </div>

                      {request.secretary_message && (
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-1">Secretary Comments:</p>
                          <p className="text-sm text-gray-700 bg-orange-50 p-2 rounded border-l-4 border-orange-400">
                            {request.secretary_message}
                          </p>
                          {request.secretary_message_sent_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Sent: {format(new Date(request.secretary_message_sent_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                        <span>Submitted: {format(new Date(request.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-orange-700 bg-orange-50 p-2 rounded flex-1">
                          ℹ️ This request was returned to the student for additional information or clarification.
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteRequest(request.id)}
                          className="ml-2 flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="forwarded" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filterRequestsByStatus('forwarded').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No forwarded excuse requests
                </div>
              ) : (
                filterRequestsByStatus('forwarded').map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-blue-400">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {request.user_profile?.full_name || request.user_profile?.email}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            {request.event_title} - {format(new Date(request.event_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Reason:</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{request.reason}</p>
                      </div>

                      {request.secretary_message && (
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-1">Secretary Message:</p>
                          <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{request.secretary_message}</p>
                          {request.secretary_message_sent_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Sent: {format(new Date(request.secretary_message_sent_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                        <span>Submitted: {format(new Date(request.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
                        {request.forwarded_at && (
                          <span>Forwarded: {format(new Date(request.forwarded_at), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isAdmin && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                            variant="outline"
                          >
                            Review Request
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteRequest(request.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="reviewed" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filterRequestsByStatus('reviewed').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No reviewed excuse requests
                </div>
              ) : (
                filterRequestsByStatus('reviewed').map((request) => (
                  <Card key={request.id} className={`border-l-4 ${request.status === 'approved' ? 'border-l-green-400' : 'border-l-red-400'}`}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {request.user_profile?.full_name || request.user_profile?.email}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            {request.event_title} - {format(new Date(request.event_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Reason:</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{request.reason}</p>
                      </div>

                      {request.admin_notes && (
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-1">Admin Notes:</p>
                          <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{request.admin_notes}</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                        <span>Submitted: {format(new Date(request.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
                        {request.reviewed_at && (
                          <span>Reviewed: {format(new Date(request.reviewed_at), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteRequest(request.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedRequest && isAdmin && (
        <Card className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Review Excuse Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold">Student: {selectedRequest.user_profile?.full_name}</p>
                <p className="text-sm text-gray-600">Event: {selectedRequest.event_title}</p>
                <p className="text-sm text-gray-600">Date: {format(new Date(selectedRequest.event_date), 'MMM dd, yyyy')}</p>
              </div>

              <div>
                <p className="font-medium mb-2">Reason:</p>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedRequest.reason}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Admin Notes (Optional):</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => reviewRequest(selectedRequest.id, 'approved')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => reviewRequest(selectedRequest.id, 'denied')}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deny
                </Button>
                <Button
                  onClick={() => setSelectedRequest(null)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Send Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Return Request with Comments</DialogTitle>
            <DialogDescription>
              Send comments or questions to {selectedRequest?.user_profile?.full_name || 'the student'} regarding their excuse request.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-medium">Request Details:</p>
                <p className="text-sm text-gray-700">
                  {selectedRequest.event_title} - {format(new Date(selectedRequest.event_date), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600 mt-1">Reason: {selectedRequest.reason}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Your Comments:</label>
                <Textarea
                  value={messageToUser}
                  onChange={(e) => setMessageToUser(e.target.value)}
                  placeholder="Type your comments, questions, or instructions for the student here..."
                  rows={4}
                  className="w-full"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMessageDialogOpen(false);
                setMessageToUser('');
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && sendMessageToUser(selectedRequest.id)}
              disabled={sendingMessage || !messageToUser.trim()}
              className="flex items-center gap-2"
            >
              {sendingMessage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Comments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};