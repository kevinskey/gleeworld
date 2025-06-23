
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

interface ViewTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  template: ContractTemplate | null;
  onUseTemplate: (template: ContractTemplate) => void;
}

export const ViewTemplateDialog = ({ isOpen, onOpenChange, template, onUseTemplate }: ViewTemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.name}</DialogTitle>
          <DialogDescription>
            Created: {template && new Date(template.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        {template && (
          <div className="space-y-4">
            {template.header_image_url && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <Label className="font-medium">Header Image:</Label>
                <img 
                  src={template.header_image_url} 
                  alt="Template header" 
                  className="mt-2 max-h-40 mx-auto rounded border"
                  onError={(e) => {
                    console.log('Header image failed to load in view dialog:', template.header_image_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div>
              <Label className="font-medium">Template Content:</Label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                {template.template_content}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => template && onUseTemplate(template)}>Use Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
