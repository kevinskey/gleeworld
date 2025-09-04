// Reusable contract list component
import React, { useState } from 'react';
import { ContractCard } from './ContractCard';
import { ContractFilters } from './ContractFilters';
import { ContractStats } from './ContractStats';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { 
  Contract, 
  ContractAction, 
  ContractFilters as FilterType,
  ContractStats as StatsType 
} from "@/types/contracts";

interface ContractListProps {
  contracts: Contract[];
  loading?: boolean;
  error?: string | null;
  stats?: StatsType;
  filters?: FilterType;
  onFiltersChange?: (filters: Partial<FilterType>) => void;
  onSearch?: (query: string) => void;
  onCreateNew?: () => void;
  onContractView?: (contract: Contract) => void;
  onContractEdit?: (contract: Contract) => void;
  onContractSend?: (contract: Contract) => void;
  onContractDuplicate?: (contract: Contract) => void;
  onContractDelete?: (contract: Contract) => void;
  actions?: ContractAction[];
  showStats?: boolean;
  showFilters?: boolean;
  showCreateButton?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  title?: string;
}

export const ContractList: React.FC<ContractListProps> = ({
  contracts,
  loading = false,
  error = null,
  stats,
  filters,
  onFiltersChange,
  onSearch,
  onCreateNew,
  onContractView,
  onContractEdit,
  onContractSend,
  onContractDuplicate,
  onContractDelete,
  actions,
  showStats = true,
  showFilters = true,
  showCreateButton = true,
  compact = false,
  emptyMessage = "No contracts found",
  title = "Contracts"
}) => {
  const [searchQuery, setSearchQuery] = useState(filters?.search || '');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading contracts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">Error loading contracts</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {stats && (
            <p className="text-muted-foreground">
              {stats.total} total contracts
            </p>
          )}
        </div>
        {showCreateButton && (
          <Button onClick={onCreateNew} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Contract
          </Button>
        )}
      </div>

      {/* Stats */}
      {showStats && stats && (
        <ContractStats stats={stats} />
      )}

      {/* Search and Filters */}
      {(showFilters || onSearch) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {onSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          {showFilters && onFiltersChange && (
            <Button
              variant="outline"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="w-full sm:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {showFilterPanel && showFilters && onFiltersChange && (
        <ContractFilters
          filters={filters || {}}
          onFiltersChange={onFiltersChange}
          onClose={() => setShowFilterPanel(false)}
        />
      )}

      {/* Contract Grid */}
      {contracts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">{emptyMessage}</div>
          {showCreateButton && onCreateNew && (
            <Button onClick={onCreateNew} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Contract
            </Button>
          )}
        </div>
      ) : (
        <div className={`grid gap-4 ${
          compact 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              actions={actions}
              onView={onContractView}
              onEdit={onContractEdit}
              onSend={onContractSend}
              onDuplicate={onContractDuplicate}
              onDelete={onContractDelete}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
};