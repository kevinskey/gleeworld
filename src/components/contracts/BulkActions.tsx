
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Users } from "lucide-react";
import { useRef, useEffect } from "react";

interface BulkActionsProps {
  contracts: any[];
  selectedContracts: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onDeleteSelected: () => void;
  onSendToRoster?: (contract: any) => void;
}

export const BulkActions = ({ 
  contracts, 
  selectedContracts, 
  onSelectAll, 
  onDeleteSelected,
  onSendToRoster
}: BulkActionsProps) => {
  const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);
  const allSelected = contracts.length > 0 && selectedContracts.size === contracts.length;
  const someSelected = selectedContracts.size > 0 && selectedContracts.size < contracts.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const checkboxElement = selectAllCheckboxRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkboxElement) {
        checkboxElement.indeterminate = someSelected;
      }
    }
  }, [someSelected]);

  // Get the single selected contract for bulk send
  const singleSelectedContract = selectedContracts.size === 1 
    ? contracts.find((c: any) => selectedContracts.has(c.id))
    : null;

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center space-x-3">
        <Checkbox 
          ref={selectAllCheckboxRef}
          checked={allSelected}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm font-medium">
          {selectedContracts.size === 0 
            ? "Select all" 
            : `${selectedContracts.size} selected`
          }
        </span>
      </div>
      {selectedContracts.size > 0 && (
        <div className="flex items-center gap-2">
          {singleSelectedContract && onSendToRoster && (
            <Button 
              onClick={() => onSendToRoster(singleSelectedContract)}
              variant="secondary"
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Send to Roster
            </Button>
          )}
          <Button 
            onClick={onDeleteSelected}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedContracts.size})
          </Button>
        </div>
      )}
    </div>
  );
};
