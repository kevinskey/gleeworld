
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface StipendAmountFieldProps {
  stipendAmount: string;
  onStipendChange: (amount: string) => void;
  showField: boolean;
}

export const StipendAmountField = ({ stipendAmount, onStipendChange, showField }: StipendAmountFieldProps) => {
  if (!showField) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal points
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onStipendChange(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="stipend-amount">Stipend Amount ($)</Label>
      <Input
        id="stipend-amount"
        type="text"
        value={stipendAmount}
        onChange={handleInputChange}
        placeholder="Enter stipend amount"
        inputMode="decimal"
      />
    </div>
  );
};
