import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Clock, DollarSign } from "lucide-react";
import { useState } from "react";

interface PaymentPlanSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlan: (planType: 'full_payment' | 'two_installments' | 'three_installments') => void;
  duesAmount: number;
}

const paymentOptions = [
  {
    id: 'full_payment',
    label: 'Pay in Full',
    description: 'Pay the complete amount by September 15, 2025',
    icon: DollarSign,
    installments: 1,
    schedule: 'Single payment due September 15, 2025',
    benefits: ['No payment plan fees', 'One simple payment'],
  },
  {
    id: 'two_installments',
    label: '2-Payment Plan',
    description: 'Split payment into 2 equal installments',
    icon: Calendar,
    installments: 2,
    schedule: '1st payment: August 15, 2025 | 2nd payment: September 15, 2025',
    benefits: ['Split into 2 payments', 'More manageable amounts'],
  },
  {
    id: 'three_installments',
    label: '3-Payment Plan',
    description: 'Split payment into 3 equal installments',
    icon: Clock,
    installments: 3,
    schedule: '1st: July 15 | 2nd: August 15 | 3rd: September 15, 2025',
    benefits: ['Smallest monthly payments', 'Extended payment period'],
  },
];

export const PaymentPlanSelectionDialog = ({
  open,
  onOpenChange,
  onSelectPlan,
  duesAmount,
}: PaymentPlanSelectionDialogProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleConfirmSelection = () => {
    if (selectedPlan) {
      onSelectPlan(selectedPlan as any);
      onOpenChange(false);
      setSelectedPlan(null);
    }
  };

  const calculateInstallmentAmount = (planType: string) => {
    switch (planType) {
      case 'full_payment':
        return duesAmount;
      case 'two_installments':
        return duesAmount / 2;
      case 'three_installments':
        return duesAmount / 3;
      default:
        return duesAmount;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Payment Plan</DialogTitle>
          <p className="text-muted-foreground">
            Choose how you'd like to pay your ${duesAmount} semester dues
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {paymentOptions.map((option) => {
            const Icon = option.icon;
            const installmentAmount = calculateInstallmentAmount(option.id);
            const isSelected = selectedPlan === option.id;

            return (
              <Card 
                key={option.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary border-primary' : ''
                }`}
                onClick={() => setSelectedPlan(option.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{option.label}</CardTitle>
                      <CardDescription className="text-sm">
                        {option.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      ${installmentAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      per payment
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Badge variant="outline" className="w-full justify-center">
                      {option.installments} payment{option.installments > 1 ? 's' : ''}
                    </Badge>
                    <p className="text-xs text-muted-foreground text-center">
                      {option.schedule}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Benefits:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {option.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            All payment plans are due by September 15, 2025
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSelection}
              disabled={!selectedPlan}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Confirm Payment Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};