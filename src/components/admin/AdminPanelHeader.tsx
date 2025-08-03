import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContractSummaryStats } from "./ContractSummaryStats";
import { AdminIconsPanel } from "./AdminIconsPanel";
import { 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  FileText, 
  Shield,
  Settings
} from "lucide-react";

interface AdminPanelHeaderProps {
  contractsLoading?: boolean;
  onSendW9Forms: () => void;
}

export const AdminPanelHeader = ({ contractsLoading, onSendW9Forms }: AdminPanelHeaderProps) => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(true);
  const [contractStatsOpen, setContractStatsOpen] = useState(false);
  const [adminControlsOpen, setAdminControlsOpen] = useState(false);

  // Mock contract data - replace with real data
  const mockContracts = [
    { id: '1', status: 'draft' },
    { id: '2', status: 'pending_admin_signature' },
    { id: '3', status: 'completed' },
    { id: '4', status: 'archived' },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Quick Actions */}
      <Collapsible open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
        <Card className="glass-card border border-white/10">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors pb-3 md:pb-4 p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                    {quickActionsOpen ? (
                      <ChevronDown className="h-4 w-4 text-white/70" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/70" />
                    )}
                  </Button>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Mail className="h-5 w-5 text-blue-400" />
                    Quick Actions
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <Button
                  onClick={onSendW9Forms}
                  className="bg-blue-600 hover:bg-blue-700 justify-start h-auto p-3 md:p-4"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">Send W9 Forms</span>
                    </div>
                    <p className="text-xs text-blue-100">Send tax forms to users and track completion</p>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 justify-start h-auto p-3 md:p-4"
                  onClick={() => {/* Add contract action */}}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Manage Contracts</span>
                    </div>
                    <p className="text-xs text-white/70">View and manage contract signatures</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Contract Statistics */}
      <Collapsible open={contractStatsOpen} onOpenChange={setContractStatsOpen}>
        <Card className="glass-card border border-white/10">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                    {contractStatsOpen ? (
                      <ChevronDown className="h-4 w-4 text-white/70" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/70" />
                    )}
                  </Button>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="h-5 w-5 text-green-400" />
                    Contract Overview
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ContractSummaryStats 
                contracts={mockContracts as any} 
                loading={contractsLoading || false} 
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Admin Controls */}
      <Collapsible open={adminControlsOpen} onOpenChange={setAdminControlsOpen}>
        <Card className="glass-card border border-white/10">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                    {adminControlsOpen ? (
                      <ChevronDown className="h-4 w-4 text-white/70" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/70" />
                    )}
                  </Button>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5 text-red-400" />
                    Administrative Controls
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <AdminIconsPanel />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};