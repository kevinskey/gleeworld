
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [currentTemplate, setCurrentTemplate] = useState<ContractTemplate | null>(null);

  // Update the current template whenever the template prop changes
  useEffect(() => {
    if (template) {
      console.log('ViewTemplateDialog: Template updated', {
        id: template.id,
        name: template.name,
        contentLength: template.template_content?.length || 0,
        updated_at: template.updated_at
      });
      setCurrentTemplate(template);
    }
  }, [template]);

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentTemplate(null);
    }
  }, [isOpen]);

  const displayTemplate = currentTemplate || template;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{displayTemplate?.name}</DialogTitle>
          <DialogDescription>
            Created: {displayTemplate && new Date(displayTemplate.created_at).toLocaleDateString()}
            {displayTemplate?.contract_type && ` • Type: ${displayTemplate.contract_type}`}
            {displayTemplate?.updated_at && ` • Updated: ${new Date(displayTemplate.updated_at).toLocaleDateString()}`}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          {displayTemplate && (
            <div className="space-y-4">
              {displayTemplate.header_image_url && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <Label className="font-medium">Header Image:</Label>
                  <img 
                    src={displayTemplate.header_image_url} 
                    alt="Template header" 
                    className="mt-2 max-h-40 mx-auto rounded border"
                    onError={(e) => {
                      console.log('Header image failed to load in view dialog:', displayTemplate.header_image_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div>
                <Label className="font-medium mb-2 block">Template Content:</Label>
                <div className="border rounded-lg p-6 bg-white min-h-[300px] text-sm leading-relaxed">
                  {displayTemplate.template_content ? (
                    <div className="whitespace-pre-wrap break-words text-black">
                      {displayTemplate.template_content}
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
          
          {!displayTemplate && (
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
            onClick={() => displayTemplate && onUseTemplate(displayTemplate)}
            disabled={isCreating || !displayTemplate}
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
