
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Users } from "lucide-react";
import { useRef, useEffect } from "react";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";

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
          <ConfirmDeleteButton
            confirmKey="delete-selected-contracts"
            title={`Delete ${selectedContracts.size} contract(s)?`}
            description="The selected contracts will be permanently removed."
            onConfirm={onDeleteSelected}
            ariaLabel="Delete selected contracts"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedContracts.size})
          </ConfirmDeleteButton>
        </div>
      )}
    </div>
  );
};
