import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface AdminNotesCardProps {
  notes?: string;
  isEditing?: boolean;
  isAdmin?: boolean;
  onNotesChange?: (value: string) => void;
}

export const AdminNotesCard = ({
  notes = "",
  isEditing = false,
  isAdmin = false,
  onNotesChange,
}: AdminNotesCardProps) => {
  // Only admins can see this card
  if (!isAdmin) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Admin Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Notes</h4>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            disabled={!isEditing}
            className="min-h-[100px] text-sm"
            placeholder="Add administrative notes..."
          />
        </div>
      </CardContent>
    </Card>
  );
};
