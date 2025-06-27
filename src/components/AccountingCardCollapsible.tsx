
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export const AccountingCardCollapsible = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="w-full max-w-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <div className="text-left">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Accounting
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>Track stipends and contract payments</CardDescription>
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              View detailed accounting information for all signed contracts with stipend amounts.
            </p>
            <Button asChild className="w-full">
              <Link to="/accounting">
                <DollarSign className="h-4 w-4 mr-2" />
                View Accounting
              </Link>
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
