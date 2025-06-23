
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Copy, Trash2, Image, FileDown, Loader2 } from "lucide-react";
import { useContractFromTemplate } from "@/hooks/useContractFromTemplate";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

interface TemplateCardProps {
  template: ContractTemplate;
  onView: (template: ContractTemplate) => void;
  onEdit: (template: ContractTemplate) => void;
  onCopy: (template: ContractTemplate) => void;
  onDelete: (id: string) => void;
  onContractCreated?: () => void;
}

export const TemplateCard = ({
  template,
  onView,
  onEdit,
  onCopy,
  onDelete,
  onContractCreated
}: TemplateCardProps) => {
  const { createContractFromTemplate, isCreating } = useContractFromTemplate(onContractCreated);

  const handleUseTemplate = async () => {
    await createContractFromTemplate(template);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {template.header_image_url && (
                <Image className="h-4 w-4 text-blue-600" />
              )}
              {template.name}
            </CardTitle>
            <CardDescription>
              Created: {new Date(template.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {template.header_image_url && (
            <div className="mb-2">
              <img 
                src={template.header_image_url} 
                alt="Template header" 
                className="h-20 w-full object-contain border rounded bg-gray-50"
                onError={(e) => {
                  console.log('Image failed to load:', template.header_image_url);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', template.header_image_url);
                }}
              />
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            <p>Last modified: {new Date(template.updated_at).toLocaleDateString()}</p>
          </div>

          <div className="flex flex-col space-y-2">
            {/* Primary Use Template Button - Now creates contract directly */}
            <Button 
              onClick={handleUseTemplate}
              className="w-full"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Contract...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Create Contract
                </>
              )}
            </Button>

            {/* Secondary Action Buttons */}
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onView(template)}
                title="View template"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(template)}
                title="Edit template"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCopy(template)}
                title="Copy template"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDelete(template.id)}
                title="Delete template"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
