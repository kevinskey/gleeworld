
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useReceipts } from "@/hooks/useReceipts";
import { DollarSign, Receipt } from "lucide-react";

interface StipendAmountFieldProps {
  stipendAmount: string;
  onStipendChange: (amount: string) => void;
  showField: boolean;
  templateId?: string;
}

export const StipendAmountField = ({ 
  stipendAmount, 
  onStipendChange, 
  showField, 
  templateId 
}: StipendAmountFieldProps) => {
  const { getTemplateReceiptTotal } = useReceipts();
  
  if (!showField) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Stipend input value:', value);
    
    // Allow empty string, numbers, and one decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      console.log('Valid stipend value, calling onStipendChange:', value);
      onStipendChange(value);
    } else {
      console.log('Invalid stipend value rejected:', value);
    }
  };

  const receiptTotal = templateId ? getTemplateReceiptTotal(templateId) : 0;
  const stipendValue = parseFloat(stipendAmount) || 0;
  const totalCost = receiptTotal + stipendValue;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="stipend-amount">Stipend Amount ($)</Label>
        {templateId && receiptTotal > 0 && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            Receipts: {formatCurrency(receiptTotal)}
          </Badge>
        )}
      </div>
      
      <Input
        id="stipend-amount"
        type="text"
        value={stipendAmount}
        onChange={handleInputChange}
        placeholder="Enter stipend amount"
        inputMode="decimal"
        autoComplete="off"
      />
      
      {templateId && (receiptTotal > 0 || stipendValue > 0) && (
        <div className="flex items-center justify-between text-sm p-3 bg-spelman-700/20 rounded-lg border border-spelman-400/30">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-white/70">
              <span>Stipend:</span>
              <span>{formatCurrency(stipendValue)}</span>
            </div>
            {receiptTotal > 0 && (
              <div className="flex items-center justify-between text-white/70">
                <span>Receipts:</span>
                <span>{formatCurrency(receiptTotal)}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60">Total Cost</div>
            <div className="text-lg font-semibold text-spelman-300 flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(totalCost)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
