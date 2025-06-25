
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { useRef, useEffect } from "react";

interface BulkActionsProps {
  contracts: any[];
  selectedContracts: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onDeleteSelected: () => void;
}

export const BulkActions = ({ 
  contracts, 
  selectedContracts, 
  onSelectAll, 
  onDeleteSelected 
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

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
        <Button 
          onClick={onDeleteSelected}
          variant="destructive"
          size="sm"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected ({selectedContracts.size})
        </Button>
      )}
    </div>
  );
};
