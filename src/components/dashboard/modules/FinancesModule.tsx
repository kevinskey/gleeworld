import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentPlanSelectionDialog } from '@/components/dialogs/PaymentPlanSelectionDialog';

interface DuesRecord {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  semester: string;
  academic_year: string;
}

interface PaymentPlan {
  id: string;
  total_amount: number;
  installments: number;
  installment_amount: number;
  frequency: string;
  status: 'active' | 'paused' | 'completed';
  gw_payment_plan_installments: Array<{
    id: string;
    installment_number: number;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid';
    paid_date: string | null;
  }>;
}

export const FinancesModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [duesRecords, setDuesRecords] = useState<DuesRecord[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [showPaymentPlanDialog, setShowPaymentPlanDialog] = useState(false);
  const [selectedDuesRecord, setSelectedDuesRecord] = useState<DuesRecord | null>(null);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user]);

  const fetchFinancialData = async () => {
    try {
      // Fetch dues records
      const { data: duesData, error: duesError } = await supabase
        .from('gw_dues_records')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_date', { ascending: false });

      if (duesError) throw duesError;
      setDuesRecords((duesData || []) as DuesRecord[]);

      // Fetch payment plans
      const { data: plansData, error: plansError } = await supabase
        .from('gw_dues_payment_plans')
        .select(`
          *,
          gw_payment_plan_installments(*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;
      setPaymentPlans((plansData || []) as PaymentPlan[]);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayFullAmount = async (duesRecord: DuesRecord) => {
    setPaymentLoading(duesRecord.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-dues-payment', {
        body: {
          duesRecordId: duesRecord.id,
          paymentType: 'full'
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Payment Initiated",
        description: "You've been redirected to complete your payment",
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(null);
    }
  };

  const handlePayInstallment = async (installment: any, paymentPlanId: string, duesRecordId: string) => {
    setPaymentLoading(installment.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-dues-payment', {
        body: {
          duesRecordId,
          paymentType: 'installment',
          installmentId: installment.id,
          paymentPlanId
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Installment Payment Initiated",
        description: `Processing payment for installment ${installment.installment_number}`,
      });
    } catch (error) {
      console.error('Installment payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate installment payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(null);
    }
  };

  const handleSetupPaymentPlan = (duesRecord: DuesRecord) => {
    setSelectedDuesRecord(duesRecord);
    setShowPaymentPlanDialog(true);
  };

  const handlePaymentPlanSelected = async (planType: string) => {
    if (!selectedDuesRecord) return;

    try {
      const installmentCounts = { '2_installments': 2, '5_installments': 5, '10_installments': 10 };
      const installments = installmentCounts[planType as keyof typeof installmentCounts] || 2;
      const installmentAmount = selectedDuesRecord.amount / installments;

      const { error } = await supabase
        .from('gw_dues_payment_plans')
        .insert({
          dues_record_id: selectedDuesRecord.id,
          user_id: user?.id,
          total_amount: selectedDuesRecord.amount,
          installments,
          installment_amount: installmentAmount,
          frequency: installments === 2 ? 'bi_weekly' : installments === 5 ? 'monthly' : 'bi_monthly',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + (installments * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          status: 'active',
          auto_debit: false,
          payment_method: 'card'
        });

      if (error) throw error;

      toast({
        title: "Payment Plan Created",
        description: `Your ${installments}-installment payment plan has been set up successfully`,
      });

      fetchFinancialData();
    } catch (error) {
      console.error('Error creating payment plan:', error);
      toast({
        title: "Error",
        description: "Failed to create payment plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowPaymentPlanDialog(false);
      setSelectedDuesRecord(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <DollarSign className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p>Loading financial information...</p>
        </div>
      </div>
    );
  }

  const pendingDues = duesRecords.filter(record => record.status === 'pending');
  const activePlans = paymentPlans.filter(plan => plan.status === 'active');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Financial Dashboard</h2>
      </div>

      {/* Outstanding Dues */}
      {pendingDues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Outstanding Dues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingDues.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <h4 className="font-medium">{record.semester} {record.academic_year}</h4>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(record.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(record.amount)}</p>
                    <Badge variant={getStatusColor(record.status) as any}>
                      {record.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePayFullAmount(record)}
                      disabled={paymentLoading === record.id}
                      className="flex items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      {paymentLoading === record.id ? 'Processing...' : 'Pay Full Amount'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetupPaymentPlan(record)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Payment Plan
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Payment Plans */}
      {activePlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Active Payment Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activePlans.map((plan) => {
              const pendingInstallments = plan.gw_payment_plan_installments.filter(
                inst => inst.status === 'pending'
              );
              const nextInstallment = pendingInstallments.sort((a, b) => 
                new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
              )[0];

              // Find the corresponding dues record
              const relatedDuesRecord = duesRecords.find(record => 
                plan.total_amount === record.amount
              );

              return (
                <div key={plan.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {plan.installments} Installment Plan - {formatCurrency(plan.total_amount)}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(plan.installment_amount)} per {plan.frequency.replace('_', ' ')}
                      </p>
                    </div>
                    <Badge variant="secondary">{plan.status}</Badge>
                  </div>
                  
                  {nextInstallment && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">
                          Next Payment: Installment {nextInstallment.installment_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(nextInstallment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          {formatCurrency(nextInstallment.amount)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handlePayInstallment(
                            nextInstallment, 
                            plan.id, 
                            relatedDuesRecord?.id || ''
                          )}
                          disabled={paymentLoading === nextInstallment.id}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {paymentLoading === nextInstallment.id ? 'Processing...' : 'Pay Now'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* No Financial Activity */}
      {duesRecords.length === 0 && paymentPlans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Financial Activity</h3>
            <p className="text-muted-foreground text-center">
              You have no outstanding dues or active payment plans at this time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Plan Selection Dialog */}
      <PaymentPlanSelectionDialog
        open={showPaymentPlanDialog}
        onOpenChange={setShowPaymentPlanDialog}
        onSelectPlan={handlePaymentPlanSelected}
        duesAmount={selectedDuesRecord?.amount || 0}
      />
    </div>
  );
};