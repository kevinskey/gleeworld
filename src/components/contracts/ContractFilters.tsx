
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, SortAsc, SortDesc, Filter } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface ContractFiltersProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filterByTemplate: string;
  filterByType: string;
  filterByDate: string;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  onFilterChange: (filters: {
    template: string;
    type: string;
    date: string;
  }) => void;
  availableTemplates: string[];
  availableTypes: string[];
}

export const ContractFilters = ({
  sortBy,
  sortOrder,
  filterByTemplate,
  filterByType,
  filterByDate,
  onSortChange,
  onFilterChange,
  availableTemplates,
  availableTypes
}: ContractFiltersProps) => {
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
      template: filterByTemplate,
      type: filterByType,
      date: filterByDate,
      [key]: value === 'all' ? '' : value
    };
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({ template: '', type: '', date: '' });
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
            onClick={() => handleSortClick('created_at')}
            className={`${
              sortBy === 'created_at' 
                ? 'bg-brand-500 border-brand-600 text-white hover:bg-brand-600' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Date
            {sortBy === 'created_at' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSortClick('title')}
            className={`${
              sortBy === 'title' 
                ? 'bg-brand-500 border-brand-600 text-white hover:bg-brand-600' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Name
            {sortBy === 'title' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>
      </div>

      <CollapsibleContent>
        <div className="bg-muted/50 p-4 rounded-lg space-y-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-filter">Filter by Template</Label>
              <Select value={filterByTemplate || 'all'} onValueChange={(value) => handleFilterChange('template', value)}>
                <SelectTrigger id="template-filter">
                  <SelectValue placeholder="All templates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All templates</SelectItem>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Filter by Type</Label>
              <Select value={filterByType || 'all'} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-filter">Filter by Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={filterByDate}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                placeholder="Select date"
              />
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
