import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, DollarSign, Calendar, Users, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface BudgetApproval {
  id: string;
  event_id: string;
  approver_role: 'treasurer' | 'super_admin';
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_date?: string;
  approval_notes?: string;
  events: {
    id: string;
    title: string;
    event_name: string;
    event_date_start: string;
    location?: string;
    expected_headcount?: number;
    total_expenses?: number;
    total_income?: number;
    net_total?: number;
    created_by: string;
    treasurer_approval_status?: string;
    super_admin_approval_status?: string;
    profiles: {
      full_name: string;
      email: string;
    };
  };
}

export const BudgetApprovalDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingApprovals, setPendingApprovals] = useState<BudgetApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<BudgetApproval | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    setUserRole(profile?.role || '');
  };

  const fetchPendingApprovals = async () => {
    if (!user || !userRole) return;

    try {
      setLoading(true);
      
      // Determine what approvals this user can handle
      const approverRole = userRole === 'super-admin' ? 'super_admin' : 
                          userRole === 'treasurer' ? 'treasurer' : null;
      
      if (!approverRole) {
        setPendingApprovals([]);
        return;
      }

      // For now, let's fetch events that need approval based on budget_status
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          event_name,
          event_date_start,
          location,
          expected_headcount,
          total_expenses,
          total_income,
          net_total,
          created_by,
          budget_status,
          profiles!events_created_by_fkey(
            full_name,
            email
          )
        `)
        .eq('budget_status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to BudgetApproval format - for now all pending approval events need both approvals
      const mockApprovals: BudgetApproval[] = (events || []).map(event => {
        // Handle profiles - it might be an array or a single object
        const profileData = Array.isArray(event.profiles) && event.profiles.length > 0 
          ? event.profiles[0] 
          : event.profiles || { full_name: 'Unknown', email: 'unknown@example.com' };

        return {
          id: `${event.id}-${approverRole}`,
          event_id: event.id,
          approver_role: approverRole as 'treasurer' | 'super_admin',
          approval_status: 'pending' as const,
          events: {
            ...event,
            treasurer_approval_status: 'pending',
            super_admin_approval_status: 'pending',
            profiles: profileData as { full_name: string; email: string; }
          }
        };
      });

      setPendingApprovals(mockApprovals);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      toast({
        title: "Error",
        description: "Failed to load pending approvals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (userRole) {
      fetchPendingApprovals();
    }
  }, [user, userRole]);

  const handleApproval = async () => {
    if (!selectedApproval) return;

    try {
      // For now, let's update the budget_status to reflect approval
      let newBudgetStatus = 'pending_approval';
      
      if (approvalAction === 'approve') {
        // In a real implementation, we'd check if both approvals are complete
        // For now, we'll assume this represents final approval
        newBudgetStatus = 'approved';
      } else {
        newBudgetStatus = 'rejected';
      }

      const { error } = await supabase
        .from('events')
        .update({
          budget_status: newBudgetStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApproval.event_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Budget ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      setShowApprovalDialog(false);
      setSelectedApproval(null);
      setApprovalNotes('');
      fetchPendingApprovals();
    } catch (err) {
      console.error('Error processing approval:', err);
      toast({
        title: "Error",
        description: "Failed to process approval",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getApprovalIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!['treasurer', 'super-admin'].includes(userRole)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            Only treasurers and super admins can access budget approvals.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (pendingApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">
            No pending budget approvals at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Approvals</h2>
          <p className="text-muted-foreground">
            {pendingApprovals.length} budget{pendingApprovals.length !== 1 ? 's' : ''} awaiting your approval
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {pendingApprovals.map((approval) => (
          <Card key={approval.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {approval.events.event_name || approval.events.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Created by {approval.events.profiles.full_name} ({approval.events.profiles.email})
                  </p>
                </div>
                <Badge className={getStatusBadge(approval.approval_status)}>
                  Pending {userRole === 'treasurer' ? 'Treasurer' : 'Super Admin'} Approval
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(approval.events.event_date_start).toLocaleDateString()}</span>
                </div>
                
                {approval.events.expected_headcount && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{approval.events.expected_headcount} attendees</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Net: {formatCurrency(approval.events.net_total || 0)}</span>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Expenses</p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(approval.events.total_expenses || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Income</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(approval.events.total_income || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Net Total</p>
                  <p className={`font-medium ${(approval.events.net_total || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(approval.events.net_total || 0)}
                  </p>
                </div>
              </div>

              {/* Approval Status Summary */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getApprovalIcon(approval.events.treasurer_approval_status || 'pending')}
                    <span className="text-sm">Treasurer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getApprovalIcon(approval.events.super_admin_approval_status || 'pending')}
                    <span className="text-sm">Super Admin</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedApproval(approval);
                      setApprovalAction('reject');
                      setShowApprovalDialog(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedApproval(approval);
                      setApprovalAction('approve');
                      setShowApprovalDialog(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Budget
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve' 
                ? 'Are you sure you want to approve this budget?' 
                : 'Please provide a reason for rejecting this budget.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder={approvalAction === 'approve' 
                ? 'Optional approval notes...' 
                : 'Required: Please explain why this budget is being rejected...'}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              required={approvalAction === 'reject'}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApprovalDialog(false);
                setApprovalNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={approvalAction === 'reject' && !approvalNotes.trim()}
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
            >
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};