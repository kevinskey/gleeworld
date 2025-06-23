
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Loader2 } from "lucide-react";

interface CreateTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (template: { name: string; template_content: string; header_image: File | null; contract_type: string }) => Promise<void>;
  isCreating: boolean;
}

export const CreateTemplateDialog = ({ isOpen, onOpenChange, onCreate, isCreating }: CreateTemplateDialogProps) => {
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    template_content: "",
    header_image: null as File | null,
    contract_type: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Image file selected:', file.name, file.size);
      setNewTemplate({ ...newTemplate, header_image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetDialog = () => {
    setNewTemplate({ name: "", template_content: "", header_image: null, contract_type: "" });
    setImagePreview(null);
    onOpenChange(false);
  };

  const handleCreate = async () => {
    await onCreate(newTemplate);
    resetDialog();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a reusable contract template with optional header image
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              type="text"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter template name (e.g., Service Agreement Template)"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-type">Contract Type</Label>
            <Select value={newTemplate.contract_type} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, contract_type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select contract type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">Service Agreement</SelectItem>
                <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                <SelectItem value="employment">Employment Contract</SelectItem>
                <SelectItem value="lease">Lease Agreement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="header-image">Header Image (Optional)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                id="header-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('header-image')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {newTemplate.header_image ? 'Change Image' : 'Upload Header Image'}
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
            <p className="text-sm text-gray-500">
              Recommended: Company logo or letterhead (PNG, JPG, max 2MB)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-content">Template Content</Label>
            <Textarea
              id="template-content"
              value={newTemplate.template_content}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, template_content: e.target.value }))}
              placeholder="Enter your contract template here..."
              rows={12}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || !newTemplate.name.trim() || !newTemplate.template_content.trim() || !newTemplate.contract_type.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
