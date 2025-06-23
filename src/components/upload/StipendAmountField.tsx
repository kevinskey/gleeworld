
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface StipendAmountFieldProps {
  stipendAmount: string;
  onStipendChange: (amount: string) => void;
  showField: boolean;
}

export const StipendAmountField = ({ stipendAmount, onStipendChange, showField }: StipendAmountFieldProps) => {
  if (!showField) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor="stipend-amount">Stipend Amount ($)</Label>
      <Input
        id="stipend-amount"
        type="number"
        value={stipendAmount}
        onChange={(e) => onStipendChange(e.target.value)}
        placeholder="Enter stipend amount"
        min="0"
        step="0.01"
      />
    </div>
  );
};
