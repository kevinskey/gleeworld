import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface WardrobeCardProps {
  tshirtSize?: string;
  blazerDressSize?: string;
  shoeSize?: string;
  uniformIssued?: boolean;
  depositPaid?: boolean;
  isEditing?: boolean;
  onUniformIssuedChange?: (value: boolean) => void;
  onDepositPaidChange?: (value: boolean) => void;
}

export const WardrobeCard = ({
  tshirtSize = "M",
  blazerDressSize = "6",
  shoeSize = "8",
  uniformIssued = true,
  depositPaid = false,
  isEditing = false,
  onUniformIssuedChange,
  onDepositPaidChange,
}: WardrobeCardProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Wardrobe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Size Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">T-shirt Size</span>
            <span className="text-sm font-medium text-foreground">{tshirtSize || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Blazer/Dress Size</span>
            <span className="text-sm font-medium text-foreground">{blazerDressSize || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Shoe Size</span>
            <span className="text-sm font-medium text-foreground">{shoeSize || '—'}</span>
          </div>
        </div>

        {/* Toggle Switches */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label htmlFor="uniform-issued" className="text-sm text-muted-foreground">
              Uniform Issued
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                id="uniform-issued"
                checked={uniformIssued}
                onCheckedChange={onUniformIssuedChange}
                disabled={!isEditing}
              />
              <span className="text-xs text-green-600 font-medium">
                {uniformIssued ? 'YES' : 'NO'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="deposit-paid" className="text-sm text-muted-foreground">
              Deposit Paid
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                id="deposit-paid"
                checked={depositPaid}
                onCheckedChange={onDepositPaidChange}
                disabled={!isEditing}
              />
              <span className={`text-xs font-medium ${depositPaid ? 'text-green-600' : 'text-muted-foreground'}`}>
                {depositPaid ? 'YES' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
