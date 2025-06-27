
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
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <div className="text-left">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract Templates
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>Create contracts from templates</CardDescription>
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
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
