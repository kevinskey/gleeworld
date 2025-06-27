
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { DocumentUpload } from "./DocumentUpload";

interface ContractCreationCollapsibleProps {
  onContractCreated?: () => void;
}

export const ContractCreationCollapsible = ({ onContractCreated }: ContractCreationCollapsibleProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleContractCreated = () => {
    if (onContractCreated) {
      onContractCreated();
    }
  };

  return (
    <Card className="border-brand-300/40 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-brand-50/80 transition-colors rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Plus className="h-6 w-6 text-brand-500" />
                <div>
                  <CardTitle className="text-xl text-brand-800">Create Contract from Blank</CardTitle>
                  <CardDescription className="text-brand-600">
                    Upload documents or create contracts from scratch
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-brand-500 hover:text-brand-700 hover:bg-brand-100">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <DocumentUpload onContractCreated={handleContractCreated} />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
