
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText, Plus, Calendar, User } from "lucide-react";
import { useState } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { formatDistanceToNow } from "date-fns";

interface RecentContractsTemplatesCollapsibleProps {
  onNewContract: () => void;
  onNewTemplate: () => void;
  onViewContract: (contractId: string) => void;
}

export const RecentContractsTemplatesCollapsible = ({ 
  onNewContract, 
  onNewTemplate,
  onViewContract 
}: RecentContractsTemplatesCollapsibleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { contracts, loading: contractsLoading } = useContracts();
  const { templates, loading: templatesLoading } = useContractTemplates();

  // Combine and sort by creation date
  const recentItems = [
    ...contracts.map(contract => ({
      id: contract.id,
      title: contract.title,
      type: 'contract' as const,
      created_at: contract.created_at,
      status: contract.status,
      created_by: contract.created_by
    })),
    ...templates.map(template => ({
      id: template.id,
      title: template.name,
      type: 'template' as const,
      created_at: template.created_at,
      contract_type: template.contract_type
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  const handleItemClick = (item: typeof recentItems[0]) => {
    if (item.type === 'contract') {
      onViewContract(item.id);
    }
    // For templates, we could add template viewing logic here
  };

  return (
    <Card className="glass-card border-spelman-400/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-spelman-400" />
                <div>
                  <CardTitle className="text-xl text-white">Recent Contracts & Templates</CardTitle>
                  <CardDescription className="text-white/70">
                    View recent activity and create new items
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-spelman-400 hover:text-white">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={onNewContract}
                  className="flex-1 bg-spelman-600 hover:bg-spelman-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Contract
                </Button>
                <Button 
                  onClick={onNewTemplate}
                  variant="outline"
                  className="flex-1 border-spelman-400 text-spelman-400 hover:bg-spelman-400 hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              {/* Recent Items List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white/80 mb-3">Recent Activity</h4>
                
                {contractsLoading || templatesLoading ? (
                  <div className="text-center py-4">
                    <p className="text-white/60">Loading...</p>
                  </div>
                ) : recentItems.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-white/60">No recent items</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {recentItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleItemClick(item)}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`p-1.5 rounded ${
                            item.type === 'contract' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            <FileText className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-spelman-300">
                              {item.title}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-white/60">
                              <span className="capitalize">{item.type}</span>
                              {item.type === 'contract' && 'status' in item && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{item.status}</span>
                                </>
                              )}
                              {item.type === 'template' && 'contract_type' in item && item.contract_type && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{item.contract_type}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs text-white/50">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
