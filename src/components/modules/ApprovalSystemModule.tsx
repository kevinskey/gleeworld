import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, X, User, DollarSign } from "lucide-react";
import { ModuleProps } from "@/types/modules";

export const ApprovalSystemModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const approvals = [
    { id: 1, type: "Budget Request", title: "Spring Concert Decorations", amount: 850, requestor: "Sarah M.", status: "pending", date: "2024-01-15" },
    { id: 2, type: "Expense Report", title: "Travel Reimbursement - Atlanta Trip", amount: 320, requestor: "Marcus W.", status: "approved", date: "2024-01-14" },
    { id: 3, type: "Purchase Order", title: "New Sheet Music Licenses", amount: 1200, requestor: "Elena R.", status: "rejected", date: "2024-01-13" },
    { id: 4, type: "Budget Request", title: "Uniform Dry Cleaning", amount: 450, requestor: "David C.", status: "review", date: "2024-01-16" }
  ];

  const pendingAmount = approvals.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0);
  const approvedAmount = approvals.filter(a => a.status === 'approved').reduce((sum, a) => sum + a.amount, 0);

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Approval System</h1>
            <p className="text-muted-foreground">Review and approve financial requests and expense reports</p>
          </div>
          <Button>
            <CheckCircle className="h-4 w-4 mr-2" />
            Batch Approve
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{approvals.filter(a => a.status === 'pending').length}</div>
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
                  <div className="text-2xl font-bold">${pendingAmount}</div>
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
                  <div className="text-2xl font-bold">{approvals.filter(a => a.status === 'approved').length}</div>
                  <div className="text-sm text-muted-foreground">Approved Today</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${approvedAmount}</div>
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
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {approval.status === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {approval.status === 'pending' && <Clock className="h-5 w-5 text-orange-500" />}
                      {approval.status === 'rejected' && <X className="h-5 w-5 text-red-500" />}
                      {approval.status === 'review' && <User className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div>
                      <div className="font-medium">{approval.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {approval.type} • {approval.requestor} • {approval.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">${approval.amount}</div>
                      <div className="text-sm text-muted-foreground">Requested</div>
                    </div>
                    <Badge variant={
                      approval.status === 'approved' ? 'default' : 
                      approval.status === 'pending' ? 'secondary' : 
                      approval.status === 'review' ? 'outline' : 'destructive'
                    }>
                      {approval.status}
                    </Badge>
                    {approval.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Approve</Button>
                        <Button variant="ghost" size="sm">Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Approval System
        </CardTitle>
        <CardDescription>Financial approval workflows</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">{approvals.filter(a => a.status === 'pending').length} pending approvals</div>
          <div className="text-sm">${pendingAmount} awaiting approval</div>
          <div className="text-sm">{approvals.filter(a => a.status === 'approved').length} approved today</div>
        </div>
      </CardContent>
    </Card>
  );
};