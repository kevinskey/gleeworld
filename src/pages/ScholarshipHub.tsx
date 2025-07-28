import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { useScholarships } from '@/hooks/useScholarships';
import { ScholarshipCard } from '@/components/scholarships/ScholarshipCard';
import { ScholarshipFilters } from '@/components/scholarships/ScholarshipFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, GraduationCap, Star } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const ScholarshipHub = () => {
  const { user, loading: authLoading } = useAuth();
  const { scholarships, featuredScholarships, loading, error } = useScholarships();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Get all unique tags from scholarships
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    scholarships.forEach(scholarship => {
      scholarship.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [scholarships]);

  // Filter scholarships based on search term and selected tags
  const filteredScholarships = useMemo(() => {
    return scholarships.filter(scholarship => {
      // Search filter
      const matchesSearch = !searchTerm || 
        scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholarship.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholarship.eligibility?.toLowerCase().includes(searchTerm.toLowerCase());

      // Tag filter
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => scholarship.tags?.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [scholarships, searchTerm, selectedTags]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };

  if (authLoading || loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-brand-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading scholarships...</span>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GraduationCap className="h-8 w-8 text-brand-500" />
            <h1 className="text-3xl font-bebas text-brand-800 tracking-wide">Scholarship Hub</h1>
          </div>
          <p className="text-brand-600 max-w-2xl mx-auto">
            Discover scholarship opportunities to support your educational journey at Spelman College and beyond.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Featured Scholarships */}
        {featuredScholarships.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-brand-500" />
              <h2 className="text-xl font-bebas text-brand-800 tracking-wide">Featured Scholarships</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredScholarships.map((scholarship) => (
                <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <ScholarshipFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          availableTags={availableTags}
          onClearFilters={handleClearFilters}
        />

        {/* All Scholarships */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bebas text-brand-800 tracking-wide">
              All Scholarships
            </h2>
            <span className="text-sm text-brand-600">
              {filteredScholarships.length} scholarship{filteredScholarships.length === 1 ? '' : 's'} found
            </span>
          </div>

          {/* Scholarships Grid */}
          {filteredScholarships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScholarships.map((scholarship) => (
                <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
              ))}
            </div>
          ) : (
            <Card className="border-brand-200">
              <CardHeader className="text-center">
                <GraduationCap className="h-12 w-12 text-brand-300 mx-auto mb-2" />
                <CardTitle className="text-brand-600">No scholarships found</CardTitle>
                <CardDescription>
                  {searchTerm || selectedTags.length > 0
                    ? 'Try adjusting your search criteria or clearing the filters.'
                    : 'No scholarships are currently available. Check back later for new opportunities!'}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </UniversalLayout>
  );
};

export default ScholarshipHub;