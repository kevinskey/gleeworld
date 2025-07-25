import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  MessageSquare,
  Calendar,
  Eye,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MyExcuseRequest {
  id: string;
  event_id?: string | null;
  event_title: string;
  event_date: string;
  reason: string;
  status: string;
  submitted_at: string;
  admin_notes?: string | null;
  reviewed_at?: string | null;
  secretary_message?: string | null;
  secretary_message_sent_at?: string | null;
}

interface MyExcuseRequestsProps {
  onEditRequest?: (request: MyExcuseRequest) => void;
}

export const MyExcuseRequests = ({ onEditRequest }: MyExcuseRequestsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myRequests, setMyRequests] = useState<MyExcuseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const loadMyRequests = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('excuse_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error) {
      console.error('Error loading my requests:', error);
      toast({
        title: "Error",
        description: "Failed to load excuse requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      
      loadMyRequests();
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
    if (user) {
      loadMyRequests();
    }
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'returned':
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-400/30"><MessageSquare className="h-3 w-3 mr-1" />Returned</Badge>;
      case 'forwarded':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30"><Send className="h-3 w-3 mr-1" />Under Review</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-400/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-400/30"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="secondary" className="bg-white/20 text-white/80 border-white/30">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading excuse requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
      <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 border-0">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/10 transition-colors p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="truncate">My Excuse Requests</span>
                {myRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                    {myRequests.length}
                  </Badge>
                )}
              </CardTitle>
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 flex-shrink-0" />
              ) : (
                <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 flex-shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="animate-accordion-down">
          <CardContent className="p-4 sm:p-6 space-y-3">
            {myRequests.length === 0 ? (
              <div className="text-center py-6 text-white/80">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-white/50" />
                <p>No excuse requests submitted yet</p>
                <p className="text-sm text-white/60 mt-1">
                  Use the excuse generator below to submit requests
                </p>
              </div>
            ) : (
              myRequests.map((request) => (
                <Card key={request.id} className="bg-white/10 border-white/20 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {request.event_title}
                        </h4>
                        <p className="text-sm text-white/80">
                          {format(new Date(request.event_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm font-medium text-white/90 mb-1">Reason:</p>
                      <p className="text-sm text-white/80 bg-white/10 p-2 rounded">
                        {request.reason}
                      </p>
                    </div>

                    {request.secretary_message && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-white/90 mb-1">Secretary Message:</p>
                        <p className="text-sm text-white/80 bg-blue-500/20 p-2 rounded border border-blue-400/30">
                          {request.secretary_message}
                        </p>
                        {request.secretary_message_sent_at && (
                          <p className="text-xs text-white/60 mt-1">
                            Sent: {format(new Date(request.secretary_message_sent_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    )}

                    {request.admin_notes && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-white/90 mb-1">Admin Response:</p>
                        <p className="text-sm text-white/80 bg-white/10 p-2 rounded">
                          {request.admin_notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      {request.status === 'returned' && onEditRequest && (
                        <Button
                          size="sm"
                          onClick={() => onEditRequest(request)}
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                        >
                          <Edit className="h-3 w-3" />
                          Edit & Resubmit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteRequest(request.id)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>

                    <div className="flex justify-between items-center text-xs text-white/60">
                      <span>Submitted: {format(new Date(request.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
                      {request.reviewed_at && (
                        <span>Reviewed: {format(new Date(request.reviewed_at), 'MMM dd, yyyy HH:mm')}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};