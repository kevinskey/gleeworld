import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScholarshipFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  availableTags: string[];
  onClearFilters: () => void;
}

export const ScholarshipFilters = ({
  searchTerm,
  onSearchChange,
  selectedTags,
  onTagToggle,
  availableTags,
  onClearFilters
}: ScholarshipFiltersProps) => {
  const hasActiveFilters = searchTerm.length > 0 || selectedTags.length > 0;

  return (
    <div className="space-y-4 p-4 bg-gradient-to-r from-brand-50 to-brand-100 rounded-lg border border-brand-200">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-500" />
        <Input
          type="text"
          placeholder="Search scholarships by title or description..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-brand-200 focus:border-brand-400 focus:ring-brand-400"
        />
      </div>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-brand-700 mb-2">Filter by tags:</h3>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? "default" : "secondary"}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-500 hover:bg-brand-600 text-white'
                      : 'bg-white hover:bg-brand-50 text-brand-700 border-brand-200'
                  }`}
                  onClick={() => onTagToggle(tag)}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-between items-center pt-2 border-t border-brand-200">
          <span className="text-sm text-brand-600">
            {selectedTags.length > 0 && `${selectedTags.length} tag${selectedTags.length === 1 ? '' : 's'} selected`}
            {selectedTags.length > 0 && searchTerm && ' • '}
            {searchTerm && `Searching for "${searchTerm}"`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-brand-600 hover:text-brand-700 hover:bg-brand-100"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
};