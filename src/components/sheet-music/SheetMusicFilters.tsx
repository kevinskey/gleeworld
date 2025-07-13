import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SheetMusicFiltersProps {
  filters: {
    voice_parts?: string[];
    difficulty_level?: string;
    composer?: string;
    search?: string;
    tags?: string[];
  };
  onFiltersChange: (filters: any) => void;
}

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];
const COMMON_TAGS = ['Classical', 'Contemporary', 'Spiritual', 'Folk', 'Pop', 'Jazz', 'Musical Theatre', 'Traditional'];

export const SheetMusicFilters = ({ filters, onFiltersChange }: SheetMusicFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleVoicePartChange = (voicePart: string, checked: boolean) => {
    const currentVoiceParts = filters.voice_parts || [];
    const newVoiceParts = checked
      ? [...currentVoiceParts, voicePart]
      : currentVoiceParts.filter(vp => vp !== voicePart);
    
    onFiltersChange({
      ...filters,
      voice_parts: newVoiceParts.length > 0 ? newVoiceParts : undefined
    });
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    const currentTags = filters.tags || [];
    const newTags = checked
      ? [...currentTags, tag]
      : currentTags.filter(t => t !== tag);
    
    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined
    });
  };

  const handleDifficultyChange = (difficulty: string) => {
    onFiltersChange({
      ...filters,
      difficulty_level: difficulty === 'all' ? undefined : difficulty
    });
  };

  const handleComposerChange = (composer: string) => {
    onFiltersChange({
      ...filters,
      composer: composer.trim() || undefined
    });
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== '' && 
    !(Array.isArray(value) && value.length === 0)
  ).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Voice Parts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Voice Parts</Label>
            <div className="space-y-2">
              {VOICE_PARTS.map((voicePart) => (
                <div key={voicePart} className="flex items-center space-x-2">
                  <Checkbox
                    id={`voice-${voicePart}`}
                    checked={filters.voice_parts?.includes(voicePart) || false}
                    onCheckedChange={(checked) => handleVoicePartChange(voicePart, checked as boolean)}
                  />
                  <Label htmlFor={`voice-${voicePart}`} className="text-sm font-normal">
                    {voicePart}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Difficulty</Label>
            <Select value={filters.difficulty_level || 'all'} onValueChange={handleDifficultyChange}>
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {DIFFICULTY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Composer */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Composer</Label>
            <Input
              placeholder="Search by composer..."
              value={filters.composer || ''}
              onChange={(e) => handleComposerChange(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {COMMON_TAGS.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={filters.tags?.includes(tag) || false}
                    onCheckedChange={(checked) => handleTagChange(tag, checked as boolean)}
                  />
                  <Label htmlFor={`tag-${tag}`} className="text-sm font-normal">
                    {tag}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};