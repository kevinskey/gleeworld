
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings } from "lucide-react";
import { useState } from "react";
import { AdminPanel } from "@/components/AdminPanel";

export const AdminPanelCollapsible = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="w-full border-brand-300/40 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-brand-50/80 rounded-xl">
              <div className="text-left">
                <CardTitle className="flex items-center gap-2 text-brand-800">
                  <Settings className="h-5 w-5 text-brand-500" />
                  Admin Panel
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-brand-500`} />
                </CardTitle>
                <CardDescription className="text-brand-600">Manage users, templates, and system settings</CardDescription>
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            <AdminPanel />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
