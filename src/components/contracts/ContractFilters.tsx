// Contract filters component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { ContractFilters as FilterType } from "@/types/contracts";

interface ContractFiltersProps {
  filters?: FilterType;
  onFiltersChange: (filters: Partial<FilterType>) => void;
  onClose?: () => void;
  // Support legacy props from ContractsList
  sortBy?: string;
  sortOrder?: "desc" | "asc";
  filterByTemplate?: string;
  filterByType?: string;
  filterByDate?: string;
  onSortChange?: (newSortBy: string, newSortOrder: "desc" | "asc") => void;
  availableTemplates?: string[];
  availableTypes?: string[];
}

// Support for legacy usage pattern
interface LegacyContractFiltersProps {
  sortBy: string;
  sortOrder: "desc" | "asc";
  filterByTemplate: string;
  filterByType: string;
  filterByDate: string;
  onSortChange: (newSortBy: string, newSortOrder: "desc" | "asc") => void;
  onFiltersChange: (filters: { template: string; type: string; date: string; }) => void;
  availableTemplates: string[];
  availableTypes: string[];
}

export const ContractFilters: React.FC<ContractFiltersProps | LegacyContractFiltersProps> = (props) => {
  // Handle both new and legacy props
  const isLegacy = 'sortBy' in props && 'filterByTemplate' in props;
  
  if (isLegacy) {
    // Legacy mode - just render a simple component for now
    return (
      <div className="text-sm text-muted-foreground">
        Filters: {props.filterByType && `Type: ${props.filterByType}`}
      </div>
    );
  }

  const { filters = {}, onFiltersChange, onClose } = props as ContractFiltersProps;
  const statusOptions = ['draft', 'sent', 'signed', 'completed', 'cancelled'];
  const typeOptions = ['performance', 'service', 'wardrobe', 'general'];

  const toggleStatus = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status as any)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status as any];
    onFiltersChange({ status: newStatuses });
  };

  const toggleType = (type: string) => {
    const currentTypes = filters.type || [];
    const newTypes = currentTypes.includes(type as any)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type as any];
    onFiltersChange({ type: newTypes });
  };

  const clearFilters = () => {
    onFiltersChange({ status: [], type: [], search: '' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Filters</CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Status</h4>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <Badge
                key={status}
                variant={filters.status?.includes(status as any) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleStatus(status)}
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Type</h4>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((type) => (
              <Badge
                key={type}
                variant={filters.type?.includes(type as any) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleType(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear All Filters
        </Button>
      </CardContent>
    </Card>
  );
};