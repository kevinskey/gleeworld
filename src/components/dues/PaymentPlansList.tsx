import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock,
  Play,
  Pause,
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";

interface PaymentPlansListProps {
  paymentPlans: any[];
  onRefresh: () => void;
}

export const PaymentPlansList = ({ paymentPlans, onRefresh }: PaymentPlansListProps) => {
  const { toast } = useToast();

  const handleTogglePlan = async (planId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await (supabase as any)
        .from('gw_dues_payment_plans')
        .update({ status: newStatus })
        .eq('id', planId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Payment plan ${newStatus === 'active' ? 'activated' : 'paused'} successfully`
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error updating payment plan:', error);
      toast({
        title: "Error",
        description: "Failed to update payment plan",
        variant: "destructive"
      });
    }
  };

  const calculateProgress = (plan: any) => {
    if (!plan.gw_payment_plan_installments) return 0;
    
    const paidInstallments = plan.gw_payment_plan_installments.filter(
      (inst: any) => inst.status === 'paid'
    ).length;
    
    return plan.installments > 0 ? (paidInstallments / plan.installments) * 100 : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'paused':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'paused':
        return <Pause className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (paymentPlans.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Payment Plans</h3>
          <p className="text-muted-foreground mb-4">
            Create payment plans to help members pay dues in installments
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {paymentPlans.map((plan) => (
        <Card key={plan.id} className="bg-gradient-to-br from-brand-subtle/10 to-white border-brand-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-primary" />
                Payment Plan #{plan.id.slice(-8)}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(plan.status)} className="flex items-center gap-1">
                  {getStatusIcon(plan.status)}
                  {plan.status}
                </Badge>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  Total Amount
                </div>
                <div className="text-lg font-semibold">
                  ${plan.total_amount?.toFixed(2) || '0.00'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Installments
                </div>
                <div className="text-lg font-semibold">
                  {plan.installments} × ${plan.installment_amount?.toFixed(2) || '0.00'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Frequency
                </div>
                <div className="text-lg font-semibold capitalize">
                  {plan.frequency}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{calculateProgress(plan).toFixed(1)}% complete</span>
              </div>
              <Progress value={calculateProgress(plan)} className="h-2" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Started: {plan.start_date ? format(new Date(plan.start_date), 'MMM dd, yyyy') : 'N/A'}
                {plan.end_date && (
                  <> • Ends: {format(new Date(plan.end_date), 'MMM dd, yyyy')}</>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {plan.auto_debit && (
                  <Badge variant="outline" className="text-xs">
                    Auto-debit
                  </Badge>
                )}
                
                {plan.status === 'active' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTogglePlan(plan.id, plan.status)}
                  >
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </Button>
                )}
                
                {plan.status === 'paused' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTogglePlan(plan.id, plan.status)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Resume
                  </Button>
                )}
              </div>
            </div>
            
            {/* Installments preview */}
            {plan.gw_payment_plan_installments && plan.gw_payment_plan_installments.length > 0 && (
              <div className="border-t pt-3">
                <div className="text-sm font-medium mb-2">Recent Installments</div>
                <div className="space-y-1">
                  {plan.gw_payment_plan_installments.slice(0, 3).map((installment: any) => (
                    <div key={installment.id} className="flex items-center justify-between text-sm">
                      <span>
                        Installment #{installment.installment_number}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>${installment.amount?.toFixed(2)}</span>
                        <Badge variant={installment.status === 'paid' ? 'default' : 'outline'} className="text-xs">
                          {installment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};