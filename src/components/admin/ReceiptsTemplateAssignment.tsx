
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { DollarSign, Receipt, FileText } from "lucide-react";

interface Receipt {
  id: string;
  amount: number;
  vendor_name: string;
  description: string;
  template_id?: string;
  template?: {
    name: string;
  };
}

interface ReceiptsTemplateAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipts: Receipt[];
  onUpdate: (id: string, updates: Partial<Receipt>) => Promise<boolean>;
}

export const ReceiptsTemplateAssignment = ({ 
  open, 
  onOpenChange, 
  receipts, 
  onUpdate 
}: ReceiptsTemplateAssignmentProps) => {
  const { templates, loading: templatesLoading } = useContractTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Calculate totals by template
  const templateTotals = templates.map(template => {
    const templateReceipts = receipts.filter(r => r.template_id === template.id);
    const total = templateReceipts.reduce((sum, r) => sum + r.amount, 0);
    return {
      template,
      receipts: templateReceipts,
      total
    };
  });

  const unassignedReceipts = receipts.filter(r => !r.template_id);
  const unassignedTotal = unassignedReceipts.reduce((sum, r) => sum + r.amount, 0);

  const handleAssignReceipt = async (receiptId: string, templateId: string) => {
    setUpdating(receiptId);
    try {
      await onUpdate(receiptId, { template_id: templateId || undefined });
    } finally {
      setUpdating(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/20 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-spelman-400" />
            Template Stipend Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Totals Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateTotals.map(({ template, receipts: templateReceipts, total }) => (
              <Card key={template.id} className="glass-card border-white/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(total)}
                  </div>
                  <p className="text-xs text-white/60">
                    {templateReceipts.length} receipt{templateReceipts.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
            
            {/* Unassigned Receipts */}
            <Card className="glass-card border-orange-400/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-300 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Unassigned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-300 mb-1">
                  {formatCurrency(unassignedTotal)}
                </div>
                <p className="text-xs text-white/60">
                  {unassignedReceipts.length} receipt{unassignedReceipts.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Receipt Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Assign Receipts to Templates</h3>
            
            {receipts.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No receipts available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receipts.map((receipt) => (
                  <div 
                    key={receipt.id} 
                    className="glass-card p-4 flex items-center justify-between border-white/10"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium text-white">{receipt.vendor_name}</h4>
                          <p className="text-sm text-white/70">{receipt.description}</p>
                        </div>
                        <Badge variant="outline" className="bg-spelman-700/50 text-spelman-200 border-spelman-400/30">
                          {formatCurrency(receipt.amount)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {receipt.template?.name && (
                        <Badge className="bg-green-700/50 text-green-200 border-green-400/30">
                          {receipt.template.name}
                        </Badge>
                      )}
                      
                      <Select
                        value={receipt.template_id || ""}
                        onValueChange={(value) => handleAssignReceipt(receipt.id, value)}
                        disabled={updating === receipt.id}
                      >
                        <SelectTrigger className="w-48 glass-input text-white">
                          <SelectValue placeholder="Assign to template" />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-white/20">
                          <SelectItem value="" className="text-white hover:bg-white/10">
                            Unassigned
                          </SelectItem>
                          {templates.map((template) => (
                            <SelectItem 
                              key={template.id} 
                              value={template.id}
                              className="text-white hover:bg-white/10"
                            >
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <Button 
            onClick={() => onOpenChange(false)}
            className="glass-button text-white font-medium"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
