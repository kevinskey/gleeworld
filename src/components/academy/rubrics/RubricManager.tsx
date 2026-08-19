import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, ChevronUp, Ruler, SortAsc } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  max_points: number;
  display_order: number;
}

interface UniversalRubric {
  id: string;
  name: string;
  description: string | null;
  total_points: number;
  course_id: string | null;
  criteria: RubricCriterion[];
  created_at: string;
}

export const RubricManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'criteria'>('name');
  const [expandedRubrics, setExpandedRubrics] = useState<Set<string>>(new Set());

  const { data: rubrics = [], isLoading } = useQuery({
    queryKey: ['universal-rubrics-manager'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_universal_rubrics')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        criteria: Array.isArray(r.criteria) ? r.criteria : [],
      })) as UniversalRubric[];
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedRubrics(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = rubrics
    .filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'points') return b.total_points - a.total_points;
      if (sortBy === 'criteria') return (b.criteria?.length || 0) - (a.criteria?.length || 0);
      return 0;
    });

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading rubrics...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Assignment Rubrics</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Define criteria and point values for consistent grading · {rubrics.length} rubric{rubrics.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rubrics by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[180px] bg-background">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="points">Total Points</SelectItem>
            <SelectItem value="criteria">Most Criteria</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rubric Cards */}
      <div className="grid gap-4">
        {filtered.map((rubric) => {
          const isExpanded = expandedRubrics.has(rubric.id);
          const criteriaCount = rubric.criteria?.length || 0;

          return (
            <Card
              key={rubric.id}
              className="border hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => toggleExpand(rubric.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{rubric.name}</span>
                    </CardTitle>
                    {rubric.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {rubric.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {rubric.total_points} pts
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {criteriaCount} criteria
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && criteriaCount > 0 && (
                <CardContent className="pt-0 pb-4">
                  <div className="border rounded-lg overflow-hidden mt-2">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_2fr_80px] gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <div>Criteria</div>
                      <div>Description</div>
                      <div className="text-right">Points</div>
                    </div>
                    {/* Criteria Rows */}
                    {rubric.criteria
                      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                      .map((criterion, idx) => (
                        <div
                          key={criterion.id || idx}
                          className="grid grid-cols-[1fr_2fr_80px] gap-2 px-4 py-3 text-sm border-t"
                        >
                          <div className="font-medium text-foreground">{criterion.name}</div>
                          <div className="text-muted-foreground text-xs leading-relaxed line-clamp-3">
                            {criterion.description}
                          </div>
                          <div className="text-right font-semibold text-foreground">
                            {criterion.max_points}
                          </div>
                        </div>
                      ))}
                    {/* Total Row */}
                    <div className="grid grid-cols-[1fr_2fr_80px] gap-2 px-4 py-2 border-t bg-muted/30 text-sm font-bold">
                      <div className="text-foreground">Total</div>
                      <div></div>
                      <div className="text-right text-foreground">{rubric.total_points}</div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ruler className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchQuery ? `No rubrics matching "${searchQuery}"` : 'No rubrics found'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
