
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

interface ViewTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  template: ContractTemplate | null;
  onUseTemplate: (template: ContractTemplate) => void;
  isCreating?: boolean;
}

export const ViewTemplateDialog = ({ 
  isOpen, 
  onOpenChange, 
  template, 
  onUseTemplate,
  isCreating = false 
}: ViewTemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{template?.name}</DialogTitle>
          <DialogDescription>
            Created: {template && new Date(template.created_at).toLocaleDateString()}
            {template?.contract_type && ` • Type: ${template.contract_type}`}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
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
                <Label className="font-medium mb-2 block">Template Content:</Label>
                <div className="border rounded-lg p-6 bg-white min-h-[300px] text-sm leading-relaxed">
                  {template.template_content ? (
                    <div className="whitespace-pre-wrap break-words">
                      {template.template_content}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">
                      No content available for this template
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!template && (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No template selected
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Close
          </Button>
          <Button 
            onClick={() => template && onUseTemplate(template)}
            disabled={isCreating || !template}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Contract...
              </>
            ) : (
              'Use Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
