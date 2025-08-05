import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, MapPin, DollarSign, Shield, FileText } from "lucide-react";

interface ContractTypeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: string) => void;
}

const contractTypes = [
  {
    id: "tour",
    label: "SCGC Tour Contract",
    description: "For performances and tours outside of Atlanta",
    icon: MapPin,
  },
  {
    id: "in-town",
    label: "SCGC In-Town Contract", 
    description: "For local performances in Atlanta area",
    icon: FileCheck,
  },
  {
    id: "stipend",
    label: "Singer Stipend Contract",
    description: "For individual singer compensation agreements",
    icon: DollarSign,
  },
  {
    id: "nda",
    label: "SCGC NDA Agreement",
    description: "Non-disclosure agreement for sensitive materials",
    icon: Shield,
  },
  {
    id: "custom",
    label: "Custom Contract",
    description: "Create a custom contract from scratch",
    icon: FileText,
  },
];

export const ContractTypeSelectionDialog = ({
  open,
  onOpenChange,
  onSelectType,
}: ContractTypeSelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Contract Type</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contractTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Card 
                key={type.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  onSelectType(type.id);
                  onOpenChange(false);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="h-6 w-6 text-primary mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{type.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};