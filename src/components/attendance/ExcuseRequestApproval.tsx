import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  Calendar,
  User,
  AlertCircle,
  Clock,
  MessageSquare,
  FileText
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
  status: string;
  submitted_at: string;
  forwarded_by?: string | null;
  forwarded_at?: string | null;
  secretary_message?: string | null;
  secretary_message_sent_at?: string | null;
  user_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

export const ExcuseRequestApproval = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [forwardedRequests, setForwardedRequests] = useState<ExcuseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ExcuseRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approved' | 'denied' | 'returned' | null>(null);
  const [gwProfile, setGwProfile] = useState<any>(null);

  const isAdmin = gwProfile?.is_admin || gwProfile?.is_super_admin;

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

  const loadForwardedRequests = async () => {
    if (!user || !isAdmin) return;

    try {
      setLoading(true);
      
      // Get forwarded excuse requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('excuse_requests')
        .select('*')
        .eq('status', 'forwarded')
        .order('forwarded_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Get user profiles for the request users
      const userIds = requestsData?.map(req => req.user_id) || [];
      
      if (userIds.length === 0) {
        setForwardedRequests([]);
        return;
      }

      // Get profiles from gw_profiles first
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

      setForwardedRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error loading forwarded requests:', error);
      toast({
        title: "Error",
        description: "Failed to load excuse requests for approval",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalDecision = (request: ExcuseRequest, action: 'approved' | 'denied' | 'returned') => {
    setSelectedRequest(request);
    setPendingAction(action);
    setAdminNotes('');
    setIsApprovalDialogOpen(true);
  };

  const submitApprovalDecision = async () => {
    if (!selectedRequest || !pendingAction) return;

    try {
      const { error } = await supabase
        .from('excuse_requests')
        .update({
          status: pendingAction,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Send notification to user
      try {
        await supabase.functions.invoke('send-excuse-notification', {
          body: {
            requestId: selectedRequest.id,
            userId: selectedRequest.user_id,
            status: pendingAction,
            adminNotes: adminNotes
          }
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      toast({
        title: "Success",
        description: `Excuse request ${pendingAction}`,
      });

      setIsApprovalDialogOpen(false);
      setSelectedRequest(null);
      setPendingAction(null);
      setAdminNotes('');
      loadForwardedRequests();
    } catch (error) {
      console.error('Error submitting approval decision:', error);
      toast({
        title: "Error",
        description: "Failed to submit approval decision",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadGwProfile();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadForwardedRequests();
    }
  }, [user, isAdmin]);

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to review excuse requests.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">Only administrators can approve excuse requests.</p>
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
            <CheckCircle className="h-5 w-5" />
            Excuse Request Approval
            <Badge variant="outline" className="ml-2">
              Director Review
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Review and approve excuse requests forwarded by the secretary
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading forwarded requests...</div>
          ) : forwardedRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No requests pending approval</p>
              <p className="text-sm mt-1">All forwarded excuse requests have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {forwardedRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-blue-500">
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
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Approval
                      </Badge>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Student's Reason:</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.reason}</p>
                    </div>

                    {request.secretary_message && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Secretary Notes:</p>
                        <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">
                          {request.secretary_message}
                        </p>
                        {request.secretary_message_sent_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Added: {format(new Date(request.secretary_message_sent_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                      <span>Submitted: {format(new Date(request.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
                      {request.forwarded_at && (
                        <span>Forwarded: {format(new Date(request.forwarded_at), 'MMM dd, yyyy HH:mm')}</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprovalDecision(request, 'approved')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleApprovalDecision(request, 'returned')}
                        variant="outline"
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Return to Secretary
                      </Button>
                      <Button
                        onClick={() => handleApprovalDecision(request, 'denied')}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Deny
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Decision Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction === 'approved' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : pendingAction === 'returned' ? (
                <MessageSquare className="h-5 w-5 text-blue-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {pendingAction === 'approved' ? 'Approve' : pendingAction === 'returned' ? 'Return to Secretary' : 'Deny'} Excuse Request
            </DialogTitle>
            <DialogDescription>
              {pendingAction === 'returned' ? 'Return this request to the secretary with questions or feedback' : 'Make your final decision on this excuse request'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <p className="font-semibold">Student: {selectedRequest.user_profile?.full_name}</p>
                <p className="text-sm text-gray-600">Event: {selectedRequest.event_title}</p>
                <p className="text-sm text-gray-600">Date: {format(new Date(selectedRequest.event_date), 'MMM dd, yyyy')}</p>
              </div>

              <div>
                <p className="font-medium mb-2">Student's Reason:</p>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.secretary_message && (
                <div>
                  <p className="font-medium mb-2">Secretary Notes:</p>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded">{selectedRequest.secretary_message}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Decision Notes {pendingAction === 'denied' || pendingAction === 'returned' ? '(Required)' : '(Optional)'}:
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    pendingAction === 'approved' 
                      ? "Add any notes about your approval decision..."
                      : pendingAction === 'returned'
                      ? "Enter questions or feedback for the secretary..."
                      : "Please explain why this request is being denied..."
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApprovalDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitApprovalDecision}
              disabled={(pendingAction === 'denied' || pendingAction === 'returned') && !adminNotes.trim()}
              className={
                pendingAction === 'approved' 
                  ? "bg-green-600 hover:bg-green-700" 
                  : pendingAction === 'returned'
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {pendingAction === 'approved' ? 'Approve Request' : pendingAction === 'returned' ? 'Return to Secretary' : 'Deny Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};