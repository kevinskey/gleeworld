import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, SortAsc, SortDesc, Filter, Search, DollarSign, FileText } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface AccountingFiltersProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filterByStatus: string;
  filterByDateRange: string;
  filterByTemplate: string;
  searchTerm: string;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  onFilterChange: (filters: {
    status: string;
    dateRange: string;
    template: string;
    search: string;
  }) => void;
  availableStatuses: string[];
  availableTemplates: Array<{ id: string; name: string; }>;
}

export const AccountingFilters = ({
  sortBy,
  sortOrder,
  filterByStatus,
  filterByDateRange,
  filterByTemplate,
  searchTerm,
  onSortChange,
  onFilterChange,
  availableStatuses,
  availableTemplates
}: AccountingFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSortClick = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      onSortChange(newSortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(newSortBy, 'desc');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      status: filterByStatus,
      dateRange: filterByDateRange,
      template: filterByTemplate,
      search: searchTerm,
      [key]: value === 'all' ? '' : value
    };
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({ status: '', dateRange: '', template: '', search: '' });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter & Sort
          </Button>
        </CollapsibleTrigger>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSortClick('dateSigned')}
            className={sortBy === 'dateSigned' ? 'bg-brand-100 border-brand-400 text-brand-800' : ''}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Date
            {sortBy === 'dateSigned' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSortClick('name')}
            className={sortBy === 'name' ? 'bg-brand-100 border-brand-400 text-brand-800' : ''}
          >
            Name
            {sortBy === 'name' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSortClick('stipend')}
            className={sortBy === 'stipend' ? 'bg-brand-100 border-brand-400 text-brand-800' : ''}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Amount
            {sortBy === 'stipend' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>
      </div>

      <CollapsibleContent>
        <div className="bg-muted/50 p-4 rounded-lg space-y-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-filter">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  type="text"
                  placeholder="Search by name or contract..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-filter">Filter by Template</Label>
              <Select value={filterByTemplate || 'all'} onValueChange={(value) => handleFilterChange('template', value)}>
                <SelectTrigger id="template-filter">
                  <SelectValue placeholder="All templates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All templates</SelectItem>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={filterByStatus || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-range-filter">Filter by Date Range</Label>
              <Select value={filterByDateRange || 'all'} onValueChange={(value) => handleFilterChange('dateRange', value)}>
                <SelectTrigger id="date-range-filter">
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="last7days">Last 7 days</SelectItem>
                  <SelectItem value="last30days">Last 30 days</SelectItem>
                  <SelectItem value="last90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
