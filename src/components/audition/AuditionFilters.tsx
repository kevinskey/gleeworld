import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, SortAsc, SortDesc, Filter, Users, Clock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface AuditionFiltersProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filterByStatus: string;
  filterByVoicePart: string;
  filterByDate: string;
  searchQuery: string;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  onFilterChange: (filters: {
    status: string;
    voicePart: string;
    date: string;
    search: string;
  }) => void;
  totalCount: number;
  filteredCount: number;
}

export const AuditionFilters = ({
  sortBy,
  sortOrder,
  filterByStatus,
  filterByVoicePart,
  filterByDate,
  searchQuery,
  onSortChange,
  onFilterChange,
  totalCount,
  filteredCount
}: AuditionFiltersProps) => {
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
      voicePart: filterByVoicePart,
      date: filterByDate,
      search: searchQuery,
      [key]: value === 'all' ? '' : value
    };
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({ status: '', voicePart: '', date: '', search: '' });
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'waitlisted', label: 'Waitlisted' }
  ];

  const voicePartOptions = [
    { value: 'all', label: 'All Voice Parts' },
    { value: 'S1', label: 'Soprano 1' },
    { value: 'S2', label: 'Soprano 2' },
    { value: 'A1', label: 'Alto 1' },
    { value: 'A2', label: 'Alto 2' },
    { value: 'T1', label: 'Tenor 1' },
    { value: 'T2', label: 'Tenor 2' },
    { value: 'B1', label: 'Bass 1' },
    { value: 'B2', label: 'Bass 2' }
  ];

  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredCount} of {totalCount} applications
        </span>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter & Sort
            </Button>
          </CollapsibleTrigger>
          
          <div className="flex items-center gap-2">
            <Button
              variant={sortBy === 'full_name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortClick('full_name')}
            >
              <Users className="h-4 w-4 mr-1" />
              Name
              {sortBy === 'full_name' && (
                sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
              )}
            </Button>
            
            <Button
              variant={sortBy === 'audition_date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortClick('audition_date')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Date
              {sortBy === 'audition_date' && (
                sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
              )}
            </Button>

            <Button
              variant={sortBy === 'audition_time' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortClick('audition_time')}
            >
              <Clock className="h-4 w-4 mr-1" />
              Time
              {sortBy === 'audition_time' && (
                sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
              )}
            </Button>

            <Button
              variant={sortBy === 'status' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortClick('status')}
            >
              Status
              {sortBy === 'status' && (
                sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="bg-muted/50 p-4 rounded-lg space-y-4 mt-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search by name or email</Label>
              <Input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Type to search..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select value={filterByStatus || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Part Filter */}
              <div className="space-y-2">
                <Label htmlFor="voice-part-filter">Filter by Voice Part</Label>
                <Select value={filterByVoicePart || 'all'} onValueChange={(value) => handleFilterChange('voicePart', value)}>
                  <SelectTrigger id="voice-part-filter">
                    <SelectValue placeholder="All voice parts" />
                  </SelectTrigger>
                  <SelectContent>
                    {voicePartOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="date-filter">Filter by Audition Date</Label>
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
    </div>
  );
};