
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import { ContractTemplates } from "@/components/ContractTemplates";

interface ContractTemplatesCollapsibleProps {
  onUseTemplate: (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => void;
  onContractCreated: () => void;
}

export const ContractTemplatesCollapsible = ({ onUseTemplate, onContractCreated }: ContractTemplatesCollapsibleProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
            <ContractTemplates 
              onUseTemplate={onUseTemplate}
              onContractCreated={onContractCreated}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
