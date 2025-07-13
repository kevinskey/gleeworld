import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Upload,
  Eye,
  User
} from 'lucide-react';

interface ExcuseRequest {
  id: string;
  reason: string;
  documentation_url?: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  gw_event_attendance: {
    id: string;
    gw_events: {
      title: string;
      event_type: string;
      start_date: string;
    };
    gw_profiles?: {
      full_name: string;
    };
  };
}

interface AttendanceRecord {
  id: string;
  attendance_status: string;
  gw_events: {
    title: string;
    event_type: string;
    start_date: string;
  };
}

export const ExcuseRequests = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ExcuseRequest[]>([]);
  const [allRequests, setAllRequests] = useState<ExcuseRequest[]>([]);
  const [absences, setAbsences] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState('');
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  const isSectionLeader = false; // TODO: Add is_section_leader to profile
  const canReviewRequests = isAdmin || isSectionLeader;

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load user's excuse requests
      const { data: userRequests, error: userError } = await supabase
        .from('gw_attendance_excuses')
        .select(`
          id,
          reason,
          documentation_url,
          status,
          reviewed_by,
          reviewed_at,
          created_at,
          gw_event_attendance!gw_attendance_excuses_attendance_id_fkey(
            gw_events!gw_event_attendance_event_id_fkey(
              title,
              event_type,
              start_date
            )
          )
        `)
        .eq('gw_event_attendance.user_id', user!.id)
        .order('created_at', { ascending: false });

      if (userError) throw userError;
      setRequests(userRequests || []);

      // Load all requests if user can review them
      if (canReviewRequests) {
        const { data: allRequestsData, error: allError } = await supabase
          .from('gw_attendance_excuses')
          .select(`
            id,
            reason,
            documentation_url,
            status,
            reviewed_by,
            reviewed_at,
            created_at,
            gw_event_attendance!gw_attendance_excuses_attendance_id_fkey(
              gw_events!gw_event_attendance_event_id_fkey(
                title,
                event_type,
                start_date
              ),
              gw_profiles!gw_event_attendance_user_id_fkey(
                full_name
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (allError) throw allError;
        setAllRequests(allRequestsData || []);
      }

      // Load user's unexcused absences
      const { data: absenceData, error: absenceError } = await supabase
        .from('gw_event_attendance')
        .select(`
          id,
          attendance_status,
          gw_events!gw_event_attendance_event_id_fkey(
            title,
            event_type,
            start_date
          )
        `)
        .eq('user_id', user!.id)
        .eq('attendance_status', 'absent')
        .order('created_at', { ascending: false });

      if (absenceError) throw absenceError;

      // Filter out absences that already have excuse requests
      const existingExcuseAttendanceIds = new Set(
        userRequests?.map(req => req.gw_event_attendance?.id).filter(Boolean) || []
      );
      
      const availableAbsences = absenceData?.filter(
        absence => !existingExcuseAttendanceIds.has(absence.id)
      ) || [];

      setAbsences(availableAbsences);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load excuse requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitExcuseRequest = async () => {
    if (!selectedAbsence || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please select an absence and provide a reason",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      let documentUrl = null;

      // Upload document if provided
      if (documentFile) {
        const fileExt = documentFile.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('user-files')
          .upload(fileName, documentFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-files')
          .getPublicUrl(fileName);

        documentUrl = publicUrl;
      }

      // Create excuse request
      const { error } = await supabase
        .from('gw_attendance_excuses')
        .insert([{
          attendance_id: selectedAbsence,
          reason: reason.trim(),
          documentation_url: documentUrl
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Excuse request submitted successfully",
      });

      // Reset form
      setSelectedAbsence('');
      setReason('');
      setDocumentFile(null);
      setShowCreateDialog(false);

      // Reload data
      loadData();

    } catch (error) {
      console.error('Error submitting excuse request:', error);
      toast({
        title: "Error",
        description: "Failed to submit excuse request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reviewExcuseRequest = async (requestId: string, status: 'approved' | 'denied') => {
    try {
      const { error } = await supabase
        .from('gw_attendance_excuses')
        .update({
          status,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Excuse request ${status}`,
      });

      // Update attendance record if approved
      if (status === 'approved') {
        const request = allRequests.find(r => r.id === requestId);
        if (request?.gw_event_attendance?.id) {
          await supabase
            .from('gw_event_attendance')
            .update({ attendance_status: 'excused' })
            .eq('id', request.gw_event_attendance.id);
        }
      }

      // Reload data
      loadData();

    } catch (error) {
      console.error('Error reviewing excuse request:', error);
      toast({
        title: "Error",
        description: "Failed to review excuse request",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to manage excuse requests.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Request */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Excuse Requests
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Excuse Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Absence</Label>
                  <Select value={selectedAbsence} onValueChange={setSelectedAbsence}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an absence to excuse" />
                    </SelectTrigger>
                    <SelectContent>
                      {absences.map(absence => (
                        <SelectItem key={absence.id} value={absence.id}>
                          <div>
                            <div className="font-medium">{absence.gw_events.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(absence.gw_events.start_date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Reason for Absence</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please explain why you were absent..."
                    className="min-h-24"
                  />
                </div>

                <div>
                  <Label>Supporting Documentation (Optional)</Label>
                  <Input
                    type="file"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload doctor's note, email, or other supporting documents
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={submitExcuseRequest}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Excuse Requests</h3>
              <p className="text-gray-600">You haven't submitted any excuse requests yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <div key={request.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </div>

                  <div className="flex-1">
                    <div className="font-medium">{request.gw_event_attendance.gw_events.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {format(new Date(request.gw_event_attendance.gw_events.start_date), 'MMM dd, yyyy')}
                    </div>
                    <p className="text-sm mt-2 italic">"{request.reason}"</p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Submitted {format(new Date(request.created_at), 'MMM dd')}
                    </div>
                    {request.documentation_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => window.open(request.documentation_url, '_blank')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Doc
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Requests (Admin/Section Leader only) */}
      {canReviewRequests && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {allRequests
                  .filter(req => req.status === 'pending')
                  .map(request => (
                    <div key={request.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {request.gw_event_attendance?.gw_profiles?.full_name || 'Unknown Member'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.gw_event_attendance.gw_events.title} - 
                          {format(new Date(request.gw_event_attendance.gw_events.start_date), 'MMM dd, yyyy')}
                        </div>
                        <p className="text-sm mt-2 italic">"{request.reason}"</p>
                      </div>

                      <div className="flex gap-2">
                        {request.documentation_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(request.documentation_url, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Doc
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => reviewExcuseRequest(request.id, 'approved')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => reviewExcuseRequest(request.id, 'denied')}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};