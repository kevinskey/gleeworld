import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, X, User, DollarSign, Plus } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { ApprovalRequestForm } from "@/components/approval/ApprovalRequestForm";
import { useState } from "react";
import { toast } from "sonner";

export const ApprovalSystemModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const { requests, loading, updateRequestStatus } = useApprovalRequests();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const pendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  const approvedAmount = approvedRequests.reduce((sum, r) => sum + r.amount, 0);

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await updateRequestStatus(requestId, 'approved');
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await updateRequestStatus(requestId, 'rejected', undefined, 'Request denied');
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Financial Approval System</h1>
            <p className="text-muted-foreground">Review and approve financial requests and expense reports</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{pendingRequests.length}</div>
                  <div className="text-sm text-muted-foreground">Pending Approval</div>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Pending Amount</div>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{approvedRequests.length}</div>
                  <div className="text-sm text-muted-foreground">Approved Requests</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${approvedAmount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Approved Amount</div>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No approval requests found
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {request.status === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {request.status === 'pending' && <Clock className="h-5 w-5 text-orange-500" />}
                        {request.status === 'rejected' && <X className="h-5 w-5 text-red-500" />}
                        {request.status === 'review' && <User className="h-5 w-5 text-blue-500" />}
                      </div>
                      <div>
                        <div className="font-medium">{request.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.request_type.replace('_', ' ')} • {request.requestor_name} • {new Date(request.created_at).toLocaleDateString()}
                        </div>
                        {request.description && (
                          <div className="text-sm text-muted-foreground mt-1">{request.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">${request.amount.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Requested</div>
                      </div>
                      <Badge variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'pending' ? 'secondary' : 
                        request.status === 'review' ? 'outline' : 'destructive'
                      }>
                        {request.status}
                      </Badge>
                      {request.status === 'pending' && user && (
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            disabled={actionLoading === request.id}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleReject(request.id)}
                            disabled={actionLoading === request.id}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <ApprovalRequestForm 
          open={showCreateForm} 
          onClose={() => setShowCreateForm(false)} 
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Financial Approvals
        </CardTitle>
        <CardDescription>Review and manage approval requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">{pendingRequests.length} pending approvals</div>
          <div className="text-sm">${pendingAmount.toFixed(2)} awaiting approval</div>
          <div className="text-sm">{approvedRequests.length} approved requests</div>
        </div>
        <Button 
          className="w-full mt-4" 
          variant="outline" 
          onClick={() => onNavigate?.('admin-approval-system')}
        >
          View All Requests
        </Button>
      </CardContent>
    </Card>
  );
};