import { useState } from "react";
import { ChevronDown, ChevronUp, Settings2, Clock, Briefcase } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentProvider } from "@/hooks/useServiceProviders";
import { ProviderAvailabilityManager } from "@/components/providers/ProviderAvailabilityManager";
import { AppointmentServiceManager } from "@/components/appointments/AppointmentServiceManager";
import { cn } from "@/lib/utils";

type ActiveTab = "availability" | "services";

export const SuperAdminControlPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("availability");
  const { data: provider, isLoading } = useCurrentProvider();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between px-4 py-3 h-auto rounded-none border-b border-slate-200 text-sm font-semibold",
            isOpen ? "bg-slate-50" : "hover:bg-slate-50"
          )}
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-slate-600" />
            Availability & Services
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-b border-slate-200">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("availability")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                activeTab === "availability"
                  ? "text-[#003366] border-b-2 border-[#003366] bg-slate-50"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Availability
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                activeTab === "services"
                  ? "text-[#003366] border-b-2 border-[#003366] bg-slate-50"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Services
            </button>
          </div>

          {/* Content */}
          <ScrollArea className="max-h-[50vh]">
            <div className="p-3">
              {activeTab === "availability" ? (
                isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading provider...</p>
                ) : provider ? (
                  <ProviderAvailabilityManager provider={provider} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No provider profile found. Create one in the admin dashboard.
                  </p>
                )
              ) : (
                <AppointmentServiceManager />
              )}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
