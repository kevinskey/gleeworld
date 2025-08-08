
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { TemplateDialogsManager } from "@/components/templates/TemplateDialogsManager";

interface ContractTemplatesCollapsibleProps {
  onUseTemplate?: (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => void;
  onContractCreated: () => void;
}

export const ContractTemplatesCollapsible = ({ onUseTemplate, onContractCreated }: ContractTemplatesCollapsibleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { templates, loading } = useContractTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setIsViewOpen(true);
  };

  const handleContractCreated = () => {
    onContractCreated();
    setIsOpen(false);
  };

  // Mock functions for template operations (read-only mode)
  const mockCreateTemplate = async () => {};
  const mockUpdateTemplate = async () => {};

  return (
    <Card className="border-brand-300/40 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-brand-50/80 transition-colors rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-brand-500" />
                <div>
                  <CardTitle className="text-xl text-brand-800">Create Contract from Template</CardTitle>
                  <CardDescription className="text-brand-600">
                    Create contracts using pre-built templates
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-brand-500 hover:text-brand-700 hover:bg-brand-100">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading templates...
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.contract_type} • Created {new Date(template.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        onClick={() => handleTemplateSelect(template)}
                        variant="outline"
                        size="sm"
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates available. Create a template first.
                  </div>
                )}
              </div>
            )}
            
            <TemplateDialogsManager
              selectedTemplate={selectedTemplate}
              isCreateOpen={isCreateOpen}
              isEditOpen={isEditOpen}
              isViewOpen={isViewOpen}
              isCreatingTemplate={false}
              isUpdating={false}
              onCreateOpenChange={setIsCreateOpen}
              onEditOpenChange={setIsEditOpen}
              onViewOpenChange={setIsViewOpen}
              onCreateTemplate={mockCreateTemplate}
              onUpdateTemplate={mockUpdateTemplate}
              onUseTemplate={onUseTemplate}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
