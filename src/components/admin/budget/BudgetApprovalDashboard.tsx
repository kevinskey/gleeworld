import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calculator, CheckCircle, XCircle, Clock, AlertTriangle, DollarSign, User, Calendar } from "lucide-react";
import { BudgetCreator } from "@/components/budget/BudgetCreator";
import { useBudgets } from "@/hooks/useBudgets";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const BudgetApprovalDashboard = () => {
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const { budgets, loading, submitForApproval, approveBudget, refetch } = useBudgets();
  const { toast } = useToast();
  const [showBudgetCreator, setShowBudgetCreator] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Check if user is treasurer (admin) or superadmin
  const isTreasurer = isAdmin() || isSuperAdmin();
  const canApproveAsTreasurer = isTreasurer;
  const canApproveAsSuperAdmin = isSuperAdmin();

  // Filter budgets by approval status
  const draftBudgets = budgets.filter(b => b.approval_status === 'draft');
  const pendingTreasurerBudgets = budgets.filter(b => b.approval_status === 'pending_treasurer');
  const pendingSuperAdminBudgets = budgets.filter(b => b.approval_status === 'pending_superadmin');
  const approvedBudgets = budgets.filter(b => b.approval_status === 'fully_approved');
  const rejectedBudgets = budgets.filter(b => b.approval_status === 'rejected');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'pending_treasurer':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Pending Treasurer</Badge>;
      case 'pending_superadmin':
        return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Pending Super Admin</Badge>;
      case 'fully_approved':
        return <Badge variant="destructive"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSubmitForApproval = async (budgetId: string) => {
    await submitForApproval(budgetId);
    refetch();
  };

  const handleApprove = async (budgetId: string, approverRole: 'treasurer' | 'superadmin') => {
    await approveBudget(budgetId, approverRole, 'approve');
    refetch();
  };

  const handleReject = async () => {
    if (!selectedBudget || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    const approverRole = canApproveAsSuperAdmin ? 'superadmin' : 'treasurer';
    await approveBudget(selectedBudget.id, approverRole, 'reject', rejectionReason);
    setShowRejectDialog(false);
    setSelectedBudget(null);
    setRejectionReason("");
    refetch();
  };

  const renderBudgetCard = (budget: any, showActions: boolean = false, actionType?: 'submit' | 'treasurer_approve' | 'superadmin_approve') => (
    <Card key={budget.id} className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{budget.title}</CardTitle>
            <CardDescription>{budget.description}</CardDescription>
          </div>
          {getStatusBadge(budget.approval_status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <DollarSign className="h-4 w-4 mx-auto text-green-600 mb-1" />
            <p className="text-sm font-medium">{formatCurrency(budget.total_amount)}</p>
            <p className="text-xs text-muted-foreground">Total Budget</p>
          </div>
          <div className="text-center">
            <Calendar className="h-4 w-4 mx-auto text-blue-600 mb-1" />
            <p className="text-sm font-medium">{formatDate(budget.start_date)}</p>
            <p className="text-xs text-muted-foreground">Start Date</p>
          </div>
          <div className="text-center">
            <User className="h-4 w-4 mx-auto text-purple-600 mb-1" />
            <p className="text-sm font-medium">{budget.budget_type}</p>
            <p className="text-xs text-muted-foreground">Type</p>
          </div>
          <div className="text-center">
            <Clock className="h-4 w-4 mx-auto text-orange-600 mb-1" />
            <p className="text-sm font-medium">{formatDate(budget.created_at)}</p>
            <p className="text-xs text-muted-foreground">Created</p>
          </div>
        </div>

        {/* Approval Timeline */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Approval Timeline</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Created on {formatDate(budget.created_at)}</span>
            </div>
            {budget.treasurer_approved_at && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Treasurer approved on {formatDate(budget.treasurer_approved_at)}</span>
              </div>
            )}
            {budget.superadmin_approved_at && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Super Admin approved on {formatDate(budget.superadmin_approved_at)}</span>
              </div>
            )}
            {budget.rejected_at && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Rejected on {formatDate(budget.rejected_at)}</span>
                {budget.rejection_reason && (
                  <span className="text-red-600">- {budget.rejection_reason}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {showActions && (
          <div className="border-t pt-4 mt-4">
            <div className="flex gap-2">
              {actionType === 'submit' && (
                <Button 
                  onClick={() => handleSubmitForApproval(budget.id)}
                  size="sm"
                >
                  Submit for Approval
                </Button>
              )}
              {actionType === 'treasurer_approve' && canApproveAsTreasurer && (
                <>
                  <Button 
                    onClick={() => handleApprove(budget.id, 'treasurer')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve as Treasurer
                  </Button>
                  <Button 
                    onClick={() => {
                      setSelectedBudget(budget);
                      setShowRejectDialog(true);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    Reject
                  </Button>
                </>
              )}
              {actionType === 'superadmin_approve' && canApproveAsSuperAdmin && (
                <>
                  <Button 
                    onClick={() => handleApprove(budget.id, 'superadmin')}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Final Approval (Super Admin)
                  </Button>
                  <Button 
                    onClick={() => {
                      setSelectedBudget(budget);
                      setShowRejectDialog(true);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Budget Approval Dashboard</h2>
            <p className="text-muted-foreground">
              Manage budget approval workflow (Treasurer → Super Admin)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Approval Dashboard</h2>
          <p className="text-muted-foreground">
            Manage budget approval workflow: Treasurer → Super Admin
          </p>
        </div>
        <Button onClick={() => setShowBudgetCreator(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Budget
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftBudgets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Treasurer</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTreasurerBudgets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Super Admin</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSuperAdminBudgets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedBudgets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedBudgets.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Info */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Approval Workflow:</strong> Budgets must be approved by the Treasurer first, then by the Super Admin for final approval.
          {!canApproveAsTreasurer && !canApproveAsSuperAdmin && " You can only view budgets and submit your own for approval."}
          {canApproveAsTreasurer && !canApproveAsSuperAdmin && " As a Treasurer, you can approve budgets in the first step."}
          {canApproveAsSuperAdmin && " As a Super Admin, you provide final approval after Treasurer approval."}
        </AlertDescription>
      </Alert>

      {/* Budget Tabs */}
      <Tabs defaultValue="my-drafts" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="my-drafts">My Drafts ({draftBudgets.filter(b => b.created_by === user?.id).length})</TabsTrigger>
          <TabsTrigger value="pending-treasurer">Pending Treasurer ({pendingTreasurerBudgets.length})</TabsTrigger>
          <TabsTrigger value="pending-superadmin">Pending Super Admin ({pendingSuperAdminBudgets.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedBudgets.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedBudgets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-drafts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">My Draft Budgets</h3>
            <p className="text-sm text-muted-foreground">Submit these budgets for approval</p>
          </div>
          {draftBudgets.filter(b => b.created_by === user?.id).map(budget => 
            renderBudgetCard(budget, true, 'submit')
          )}
          {draftBudgets.filter(b => b.created_by === user?.id).length === 0 && (
            <p className="text-center text-muted-foreground py-8">No draft budgets found.</p>
          )}
        </TabsContent>

        <TabsContent value="pending-treasurer" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Pending Treasurer Approval</h3>
            {canApproveAsTreasurer && (
              <p className="text-sm text-green-600">You can approve these budgets</p>
            )}
          </div>
          {pendingTreasurerBudgets.map(budget => 
            renderBudgetCard(budget, canApproveAsTreasurer, 'treasurer_approve')
          )}
          {pendingTreasurerBudgets.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No budgets pending treasurer approval.</p>
          )}
        </TabsContent>

        <TabsContent value="pending-superadmin" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Pending Super Admin Approval</h3>
            {canApproveAsSuperAdmin && (
              <p className="text-sm text-blue-600">You can provide final approval for these budgets</p>
            )}
          </div>
          {pendingSuperAdminBudgets.map(budget => 
            renderBudgetCard(budget, canApproveAsSuperAdmin, 'superadmin_approve')
          )}
          {pendingSuperAdminBudgets.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No budgets pending super admin approval.</p>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Fully Approved Budgets</h3>
            <p className="text-sm text-green-600">These budgets are active and ready to use</p>
          </div>
          {approvedBudgets.map(budget => renderBudgetCard(budget))}
          {approvedBudgets.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No approved budgets found.</p>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Rejected Budgets</h3>
            <p className="text-sm text-red-600">These budgets were rejected and need revision</p>
          </div>
          {rejectedBudgets.map(budget => renderBudgetCard(budget))}
          {rejectedBudgets.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No rejected budgets found.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Budget Creator Dialog */}
      {showBudgetCreator && (
        <BudgetCreator 
          onClose={() => setShowBudgetCreator(false)}
          onSuccess={() => {
            setShowBudgetCreator(false);
            refetch();
          }}
        />
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Budget</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedBudget?.title}". This will help the creator understand what needs to be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};