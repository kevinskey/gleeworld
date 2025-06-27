
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

  return (
    <Card className="glass-card border-spelman-400/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Plus className="h-6 w-6 text-spelman-400" />
                <div>
                  <CardTitle className="text-xl text-white">Create Contract from Blank</CardTitle>
                  <CardDescription className="text-white/70">
                    Upload documents or create contracts from scratch
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-spelman-400 hover:text-white">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <DocumentUpload onContractCreated={onContractCreated} />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
