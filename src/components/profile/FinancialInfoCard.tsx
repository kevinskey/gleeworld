import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PaymentRecord {
  date: string;
  description: string;
  amount: number;
}

interface FinancialInfoCardProps {
  duesBalance?: number;
  paymentHistory?: PaymentRecord[];
  fundraiserParticipation?: string;
  isEditing?: boolean;
  onFundraiserParticipationChange?: (value: string) => void;
}

const defaultPaymentHistory: PaymentRecord[] = [
  { date: "02/01/2024", description: "Dues Payment", amount: 0.00 },
  { date: "05/13/2022", description: "Dues Payment", amount: 100.00 },
];

export const FinancialInfoCard = ({
  duesBalance = 50.00,
  paymentHistory = defaultPaymentHistory,
  fundraiserParticipation = "",
  isEditing = false,
  onFundraiserParticipationChange,
}: FinancialInfoCardProps) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Financial Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dues Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Dues Balance</span>
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(duesBalance)}
          </span>
        </div>

        {/* Payment History */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Payment History</h4>
          <div className="space-y-1">
            {paymentHistory.slice(0, 3).map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{payment.date}</span>
                <span className="text-foreground truncate max-w-[100px]">{payment.description}</span>
                <span className="text-foreground">{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fundraiser Participation */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Fundraiser Participation</h4>
          <Input
            value={fundraiserParticipation}
            onChange={(e) => onFundraiserParticipationChange?.(e.target.value)}
            disabled={!isEditing}
            className="h-9"
            placeholder="Participation details"
          />
        </div>
      </CardContent>
    </Card>
  );
};
