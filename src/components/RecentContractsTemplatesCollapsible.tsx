
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
    <Card className="border-brand-300/40 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-brand-50/80 transition-colors rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-brand-500" />
                <div>
                  <CardTitle className="text-xl text-brand-800">Recent Contracts & Templates</CardTitle>
                  <CardDescription className="text-brand-600">
                    View recent activity and create new items
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
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={onNewContract}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Contract
                </Button>
                <Button 
                  onClick={onNewTemplate}
                  variant="outline"
                  className="flex-1 border-brand-400 text-brand-600 hover:bg-brand-500 hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              {/* Recent Items List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-brand-700 mb-3">Recent Activity</h4>
                
                {contractsLoading || templatesLoading ? (
                  <div className="text-center py-4">
                    <p className="text-brand-600">Loading...</p>
                  </div>
                ) : recentItems.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-brand-600">No recent items</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {recentItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleItemClick(item)}
                        className="flex items-center justify-between p-3 rounded-lg bg-brand-50/50 hover:bg-brand-100/70 cursor-pointer transition-colors group border border-brand-200/30"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`p-1.5 rounded ${
                            item.type === 'contract' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            <FileText className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-800 truncate group-hover:text-brand-900">
                              {item.title}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-brand-600">
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
                        
                        <div className="flex items-center space-x-2 text-xs text-brand-500">
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
