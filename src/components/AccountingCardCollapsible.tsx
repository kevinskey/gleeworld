
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export const AccountingCardCollapsible = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="w-full max-w-md border-brand-300/40 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-brand-50/80 rounded-xl">
              <div className="text-left">
                <CardTitle className="flex items-center gap-2 text-brand-800">
                  <Calculator className="h-5 w-5 text-brand-500" />
                  Accounting
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-brand-500`} />
                </CardTitle>
                <CardDescription className="text-brand-600">Track stipends and contract payments</CardDescription>
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            <p className="text-sm text-brand-600 mb-4">
              View detailed accounting information for all signed contracts with stipend amounts.
            </p>
            <Button asChild className="w-full bg-brand-500 hover:bg-brand-600 text-white">
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
