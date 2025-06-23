
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

interface EditTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  template: ContractTemplate | null;
  onUpdate: (template: any) => Promise<void>;
  isUpdating: boolean;
}

export const EditTemplateDialog = ({ isOpen, onOpenChange, template, onUpdate, isUpdating }: EditTemplateDialogProps) => {
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (template && isOpen) {
      console.log('Setting editing template:', template);
      setEditingTemplate({
        id: template.id,
        name: template.name || '',
        template_content: template.template_content || '',
        header_image: null
      });
      setImagePreview(template.header_image_url || null);
    }
  }, [template, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Edit dialog - Image file selected:', file.name, file.size);
      setEditingTemplate({ ...editingTemplate, header_image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetDialog = () => {
    setEditingTemplate(null);
    setImagePreview(null);
    onOpenChange(false);
  };

  const handleUpdate = async () => {
    if (editingTemplate) {
      console.log('Submitting template update:', editingTemplate);
      await onUpdate(editingTemplate);
      resetDialog();
    }
  };

  const isFormValid = editingTemplate?.name?.trim() && editingTemplate?.template_content?.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update the template name, content, and header image
          </DialogDescription>
        </DialogHeader>
        {editingTemplate && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">Template Name *</Label>
              <Input
                id="edit-template-name"
                value={editingTemplate.name || ''}
                onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                placeholder="Service Agreement Template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-header-image">Header Image (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  id="edit-header-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('edit-header-image') as HTMLInputElement;
                    if (input) {
                      input.value = '';
                      input.click();
                    }
                  }}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {editingTemplate.header_image || imagePreview ? 'Change Image' : 'Upload New Header Image'}
                </Button>
                
                {imagePreview && (
                  <div className="mt-4">
                    <img 
                      src={imagePreview} 
                      alt="Header preview" 
                      className="max-h-32 mx-auto rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-template-content">Template Content *</Label>
              <Textarea
                id="edit-template-content"
                value={editingTemplate.template_content || ''}
                onChange={(e) => setEditingTemplate({...editingTemplate, template_content: e.target.value})}
                placeholder="Enter your contract template here..."
                rows={12}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={resetDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={isUpdating || !isFormValid}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
