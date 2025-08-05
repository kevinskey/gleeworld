import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, Users, DollarSign, Calendar, AlertCircle, Plus, Bell } from "lucide-react";
import { ModuleProps } from "@/types/modules";
import { useDuesManagement, type DuesRecord } from "@/hooks/useDuesManagement";
import { PaymentPlanSelectionDialog } from "@/components/dialogs/PaymentPlanSelectionDialog";
import { useState } from "react";

export const DuesCollectionModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const { 
    duesRecords, 
    paymentPlans, 
    loading, 
    createDuesForSemester, 
    createPaymentPlan,
    markPaymentComplete,
    sendBulkReminders 
  } = useDuesManagement();
  
  const [showPaymentPlanDialog, setShowPaymentPlanDialog] = useState(false);
  const [selectedDuesRecord, setSelectedDuesRecord] = useState<DuesRecord | null>(null);
  const [showCreateDuesDialog, setShowCreateDuesDialog] = useState(false);

  const totalDues = duesRecords.reduce((sum, record) => sum + record.amount, 0);
  const paidDues = duesRecords.filter(record => record.status === 'paid').reduce((sum, record) => sum + record.amount, 0);
  const overdueDues = duesRecords
    .filter(record => record.status === 'overdue' || (record.status === 'pending' && new Date(record.due_date) < new Date()))
    .reduce((sum, record) => sum + record.amount, 0);

  const handleCreatePaymentPlan = (duesRecord: DuesRecord) => {
    setSelectedDuesRecord(duesRecord);
    setShowPaymentPlanDialog(true);
  };

  const handlePaymentPlanSelect = async (planType: 'full_payment' | 'two_installments' | 'three_installments') => {
    if (selectedDuesRecord) {
      await createPaymentPlan(selectedDuesRecord.id, planType);
      setSelectedDuesRecord(null);
    }
  };

  const handleCreateDuesForSemester = async () => {
    await createDuesForSemester('Fall 2025', '2025-09-15', 100);
    setShowCreateDuesDialog(false);
  };

  const handleMarkPaid = async (duesRecordId: string) => {
    await markPaymentComplete(duesRecordId, 'manual');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'overdue': return 'destructive';
      case 'partial': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="p-6">Loading dues collection data...</div>;
  }

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dues Collection</h1>
            <p className="text-muted-foreground">Track and collect member dues and payments</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={sendBulkReminders} variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              Send Reminders
            </Button>
            <Dialog open={showCreateDuesDialog} onOpenChange={setShowCreateDuesDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dues Records
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Dues Records for Fall 2025</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    This will create dues records for all current members with a due date of September 15, 2025.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDuesDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateDuesForSemester}>
                      Create Records
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${totalDues.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Total Expected</div>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${paidDues.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Collected</div>
                </div>
                <CreditCard className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${overdueDues.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Overdue</div>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {totalDues > 0 ? Math.round((paidDues/totalDues) * 100) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Collection Rate</div>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Member Payment Status</CardTitle>
            <CardDescription>Due date: September 15, 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duesRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No dues records found. Create dues records for the semester to get started.
                </div>
              ) : (
                duesRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">
                          {record.user_profile?.full_name || record.user_profile?.email || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.user_profile?.role} • Due: {new Date(record.due_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">
                          ${record.amount.toFixed(2)} {record.status === 'paid' ? '(Paid)' : '(Due)'}
                        </div>
                        <div className="text-sm text-muted-foreground">{record.semester}</div>
                      </div>
                      <Badge variant={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                      <div className="flex gap-2">
                        {record.status !== 'paid' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCreatePaymentPlan(record)}
                          >
                            Payment Plan
                          </Button>
                        )}
                        {record.status !== 'paid' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleMarkPaid(record.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <PaymentPlanSelectionDialog
          open={showPaymentPlanDialog}
          onOpenChange={setShowPaymentPlanDialog}
          onSelectPlan={handlePaymentPlanSelect}
          duesAmount={selectedDuesRecord?.amount || 100}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Dues Collection
        </CardTitle>
        <CardDescription>Track member payments and dues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">${paidDues.toFixed(2)} of ${totalDues.toFixed(2)} collected</div>
          <div className="text-sm">
            {totalDues > 0 ? Math.round((paidDues/totalDues) * 100) : 0}% collection rate
          </div>
          <div className="text-sm">
            {duesRecords.filter(d => d.status === 'overdue').length} overdue payments
          </div>
        </div>
      </CardContent>
    </Card>
  );
};